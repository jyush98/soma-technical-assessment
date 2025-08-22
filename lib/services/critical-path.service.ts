// lib/services/critical-path.service.ts
import { PrismaClient } from '@prisma/client';
import { DependencyGraphService } from '@/lib/dependency-graph';

export interface CriticalPathResult {
    criticalPath: number[];
    scheduleData: any;
    isValid: boolean;
    error?: string;
    totalTasks: number;
    criticalTaskCount: number;
    projectEndDate: Date | null;
}

export class CriticalPathService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Get current critical path calculation without updating database
     */
    async getCriticalPath(): Promise<CriticalPathResult> {
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

        return {
            criticalPath: result.criticalPath || [],
            scheduleData: result.scheduleData || {},
            isValid: result.isValid,
            error: result.circularDependency?.message,
            totalTasks: todos.length,
            criticalTaskCount: result.criticalPath?.length || 0,
            projectEndDate: result.scheduleData && result.criticalPath && result.criticalPath.length > 0
                ? result.scheduleData[result.criticalPath[result.criticalPath.length - 1]]?.earliestFinish
                : null
        };
    }

    /**
     * Recalculate critical path and update all todos in database
     */
    async recalculateAndUpdate(): Promise<{
        message: string;
        criticalPath: number[];
        updatedTasks: number;
        scheduleData: any;
    }> {
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

        if (!result.isValid) {
            throw new Error(result.circularDependency?.message || 'Cannot calculate critical path');
        }

        if (result.scheduleData) {
            // Update all todos with new critical path data
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

            return {
                message: 'Critical path recalculated successfully',
                criticalPath: result.criticalPath || [],
                updatedTasks: updatePromises.length,
                scheduleData: result.scheduleData
            };
        }

        return {
            message: 'No tasks to update',
            criticalPath: [],
            updatedTasks: 0,
            scheduleData: {}
        };
    }
}