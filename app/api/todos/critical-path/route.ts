// app/api/todos/critical-path/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DependencyGraphService } from '@/lib/dependency-graph';

export async function GET() {
    try {
        const todos = await prisma.todo.findMany({
            include: {
                dependencies: { select: { dependsOnId: true } },
                dependents: { select: { todoId: true } }
            }
        });

        // Transform to match algorithm interface
        const todosForCalculation = todos.map(t => ({
            id: t.id,
            title: t.title, // Use title field directly
            completed: t.completed,
            estimatedDays: t.estimatedDays || 1,
            dependencies: t.dependencies,
            dependents: t.dependents,
            earliestStartDate: t.earliestStartDate,
            criticalPathLength: 0,
            isOnCriticalPath: t.isOnCriticalPath
        }));

        const result = DependencyGraphService.calculateCriticalPath(todosForCalculation);

        return NextResponse.json({
            criticalPath: result.criticalPath || [],
            scheduleData: result.scheduleData || {},
            isValid: result.isValid,
            error: result.circularDependency?.message,
            totalTasks: todos.length,
            criticalTaskCount: result.criticalPath?.length || 0,
            projectEndDate: result.scheduleData && result.criticalPath && result.criticalPath.length > 0
                ? result.scheduleData[result.criticalPath[result.criticalPath.length - 1]]?.earliestFinish
                : null
        });
    } catch (error: any) {
        console.error('Error calculating critical path:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        // Force recalculation and update database
        const todos = await prisma.todo.findMany({
            include: {
                dependencies: { select: { dependsOnId: true } },
                dependents: { select: { todoId: true } }
            }
        });

        // Transform to match algorithm interface
        const todosForCalculation = todos.map(t => ({
            id: t.id,
            title: t.title, // Use title field directly
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
            // Update all todos with new critical path data
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

            return NextResponse.json({
                message: 'Critical path recalculated successfully',
                criticalPath: result.criticalPath,
                updatedTasks: updatePromises.length,
                scheduleData: result.scheduleData
            });
        } else {
            return NextResponse.json(
                {
                    error: 'Cannot calculate critical path',
                    reason: result.circularDependency?.message
                },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error('Error recalculating critical path:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}