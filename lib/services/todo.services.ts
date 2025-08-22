// lib/services/todo.service.ts
import { PrismaClient } from '@prisma/client';
import { DependencyGraphService } from '@/lib/dependency-graph';

export interface CreateTodoInput {
    title: string;
    dueDate?: string | null;
    estimatedDays?: number;
    dependencies?: number[];
}

export class TodoService {
    constructor(private prisma: PrismaClient) { }

    async getAllTodos() {
        return this.prisma.todo.findMany({
            include: {
                dependencies: true,
                dependents: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async createTodo(input: CreateTodoInput) {
        const { title, dueDate, estimatedDays = 1, dependencies = [] } = input;

        // Parse due date if provided
        let parsedDueDate = null;
        if (dueDate) {
            parsedDueDate = new Date(dueDate);
            if (isNaN(parsedDueDate.getTime())) {
                throw new Error('Invalid due date format');
            }
        }

        // Create todo with transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const todo = await tx.todo.create({
                data: {
                    title: title.trim(),
                    dueDate: parsedDueDate,
                    estimatedDays,
                    completed: false,
                    imageLoading: true,
                },
            });

            if (dependencies.length > 0) {
                await tx.todoDependency.createMany({
                    data: dependencies.map((dependsOnId: number) => ({
                        todoId: todo.id,
                        dependsOnId,
                    })),
                });
            }

            return await tx.todo.findUnique({
                where: { id: todo.id },
                include: {
                    dependencies: { include: { dependsOn: true } },
                    dependents: { include: { todo: true } },
                },
            });
        });

        // Trigger async operations (non-blocking)
        this.generateImageForTodo(result!.id, result!.title);
        await this.recalculateCriticalPath();

        // Return all todos with updated state
        const allTodos = await this.getAllTodos();

        return {
            newTodo: result!.id,
            todos: allTodos
        };
    }

    private async generateImageForTodo(todoId: number, title: string) {
        // Image generation logic here (moved from route)
        try {
            const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
            if (!PEXELS_API_KEY) {
                await this.prisma.todo.update({
                    where: { id: todoId },
                    data: { imageLoading: false },
                });
                return;
            }
            // ... rest of image generation
        } catch (error) {
            console.error('Error generating image:', error);
            await this.prisma.todo.update({
                where: { id: todoId },
                data: { imageLoading: false },
            }).catch(() => { });
        }
    }

    private async recalculateCriticalPath() {
        // Critical path logic here (moved from route)
        const todos = await this.prisma.todo.findMany({
            include: {
                dependencies: { select: { dependsOnId: true } },
                dependents: { select: { todoId: true } }
            }
        });

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
            const updatePromises = Object.entries(result.scheduleData).map(
                ([todoId, scheduleInfo]) =>
                    this.prisma.todo.update({
                        where: { id: parseInt(todoId) },
                        data: {
                            earliestStartDate: scheduleInfo.earliestStart,
                            isOnCriticalPath: scheduleInfo.isOnCriticalPath
                        }
                    })
            );
            await this.prisma.$transaction(updatePromises);
        }
    }
}