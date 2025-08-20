// app/api/todos/[id]/dependencies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DependencyGraphService } from '@/lib/dependency-graph';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        if (isNaN(todoId)) {
            return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
        }

        const dependencies = await prisma.todoDependency.findMany({
            where: { todoId },
            include: {
                dependsOn: {
                    select: { id: true, title: true, completed: true }
                }
            }
        });

        return NextResponse.json(dependencies);
    } catch (error) {
        console.error('Error fetching dependencies:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        const { dependsOnId } = await request.json();

        if (isNaN(todoId) || isNaN(dependsOnId)) {
            return NextResponse.json(
                { error: 'Invalid todo IDs' },
                { status: 400 }
            );
        }

        // Verify both todos exist
        const [todo, dependsOnTodo] = await Promise.all([
            prisma.todo.findUnique({ where: { id: todoId } }),
            prisma.todo.findUnique({ where: { id: dependsOnId } })
        ]);

        if (!todo || !dependsOnTodo) {
            return NextResponse.json(
                { error: 'One or both todos not found' },
                { status: 404 }
            );
        }

        // Fetch all todos with their dependencies for validation
        const todos = await prisma.todo.findMany({
            include: {
                dependencies: { select: { dependsOnId: true } },
                dependents: { select: { todoId: true } }
            }
        });

        // Transform to match algorithm interface
        const todosForValidation = todos.map(t => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            estimatedDays: t.estimatedDays || 1,
            dependencies: t.dependencies,
            dependents: t.dependents,
            earliestStartDate: t.earliestStartDate,
            criticalPathLength: 0,
            isOnCriticalPath: t.isOnCriticalPath
        }));

        // Validate the new dependency won't create a cycle
        const validation = DependencyGraphService.validateDependency(
            todosForValidation,
            todoId,
            dependsOnId
        );

        if (!validation.isValid) {
            return NextResponse.json(
                {
                    error: 'Circular dependency detected',
                    cycle: validation.cycle,
                    message: `Adding this dependency would create a cycle: ${validation.cycle?.join(' → ')}`
                },
                { status: 400 }
            );
        }

        // Create the dependency
        const dependency = await prisma.todoDependency.create({
            data: { todoId, dependsOnId },
            include: {
                dependsOn: {
                    select: { id: true, title: true, completed: true }
                }
            }
        });

        // Recalculate critical path for all todos
        await recalculateCriticalPath();

        return NextResponse.json(dependency, { status: 201 });
    } catch (error) {
        console.error('Error creating dependency:', error);

        // Handle unique constraint violation (duplicate dependency)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Dependency already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const dependsOnId = parseInt(searchParams.get('dependsOnId') || '');

        if (isNaN(todoId) || isNaN(dependsOnId)) {
            return NextResponse.json(
                { error: 'Invalid dependency parameters' },
                { status: 400 }
            );
        }

        const deleteResult = await prisma.todoDependency.deleteMany({
            where: { todoId, dependsOnId }
        });

        if (deleteResult.count === 0) {
            return NextResponse.json(
                { error: 'Dependency not found' },
                { status: 404 }
            );
        }

        // Recalculate critical path
        await recalculateCriticalPath();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting dependency:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Recalculate critical path and update database
 */
async function recalculateCriticalPath() {
    const todos = await prisma.todo.findMany({
        include: {
            dependencies: { select: { dependsOnId: true } },
            dependents: { select: { todoId: true } }
        }
    });

    // Transform to match algorithm interface
    const todosForCalculation = todos.map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        estimatedDays: t.estimatedDays || 1,
        dependencies: t.dependencies,
        dependents: t.dependents,
        earliestStartDate: t.earliestStartDate,
        criticalPathLength: 0,
        isOnCriticalPath: t.isOnCriticalPath
    }));

    const result = DependencyGraphService.calculateCriticalPath(todosForCalculation);

    if (result.isValid && result.scheduleData) {
        // Update todos with critical path information
        const updatePromises = Object.entries(result.scheduleData).map(
            ([todoId, scheduleInfo]) =>
                prisma.todo.update({
                    where: { id: parseInt(todoId) },
                    data: {
                        earliestStartDate: scheduleInfo.earliestStart,
                        isOnCriticalPath: scheduleInfo.isOnCriticalPath
                    }
                })
        );

        await Promise.all(updatePromises);
    }
}