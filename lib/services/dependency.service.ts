// lib/services/dependency.service.ts
import { PrismaClient, TodoDependency } from '@prisma/client';
import { DependencyGraphService } from '@/lib/dependency-graph';

export class DependencyService {
    constructor(
        private prisma: PrismaClient,
        private criticalPathService: any // Import type from critical-path.service to avoid circular dep
    ) { }

    /**
     * Get all dependencies for a todo
     */
    async getDependencies(todoId: number) {
        if (isNaN(todoId)) {
            throw new Error('Invalid todo ID');
        }

        return this.prisma.todoDependency.findMany({
            where: { todoId },
            include: {
                dependsOn: {
                    select: { id: true, title: true, completed: true }
                }
            }
        });
    }

    /**
     * Add a dependency with validation
     */
    async addDependency(todoId: number, dependsOnId: number): Promise<TodoDependency> {
        // Validate IDs
        if (isNaN(todoId) || isNaN(dependsOnId)) {
            throw new Error('Invalid todo IDs');
        }

        // Verify both todos exist
        const [todo, dependsOnTodo] = await Promise.all([
            this.prisma.todo.findUnique({ where: { id: todoId } }),
            this.prisma.todo.findUnique({ where: { id: dependsOnId } })
        ]);

        if (!todo || !dependsOnTodo) {
            const error = new Error('One or both todos not found');
            (error as any).statusCode = 404;
            throw error;
        }

        // Fetch all todos for cycle validation
        const todos = await this.prisma.todo.findMany({
            include: {
                dependencies: { select: { dependsOnId: true } },
                dependents: { select: { todoId: true } }
            }
        });

        // Transform for validation
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

        // Validate no circular dependency
        const validation = DependencyGraphService.validateDependency(
            todosForValidation,
            todoId,
            dependsOnId
        );

        if (!validation.isValid) {
            const error = new Error(
                `Circular dependency detected: ${validation.cycle?.join(' → ')}`
            );
            (error as any).statusCode = 400;
            (error as any).cycle = validation.cycle;
            throw error;
        }

        try {
            // Create the dependency
            const dependency = await this.prisma.todoDependency.create({
                data: { todoId, dependsOnId },
                include: {
                    dependsOn: {
                        select: { id: true, title: true, completed: true }
                    }
                }
            });

            // Recalculate critical path
            await this.criticalPathService.recalculateAndUpdate();

            return dependency;
        } catch (error: any) {
            // Handle unique constraint violation
            if (error.code === 'P2002') {
                const dupError = new Error('Dependency already exists');
                (dupError as any).statusCode = 409;
                throw dupError;
            }
            throw error;
        }
    }

    /**
     * Remove a dependency
     */
    async removeDependency(todoId: number, dependsOnId: number): Promise<void> {
        if (isNaN(todoId) || isNaN(dependsOnId)) {
            throw new Error('Invalid dependency parameters');
        }

        const deleteResult = await this.prisma.todoDependency.deleteMany({
            where: { todoId, dependsOnId }
        });

        if (deleteResult.count === 0) {
            const error = new Error('Dependency not found');
            (error as any).statusCode = 404;
            throw error;
        }

        // Recalculate critical path
        await this.criticalPathService.recalculateAndUpdate();
    }
}