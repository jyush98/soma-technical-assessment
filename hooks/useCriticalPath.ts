// hooks/useCriticalPath.ts
import { useState, useMemo } from 'react';
import { TodoWithRelations } from '@/lib/types';

export function useCriticalPath(todos: TodoWithRelations[]) {
    const [isRecalculating, setIsRecalculating] = useState(false);

    const criticalPath = useMemo(() =>
        todos.filter(todo => todo.isOnCriticalPath).map(t => t.id),
        [todos]
    );

    const criticalPathTasks = useMemo(() =>
        todos.filter(todo => todo.isOnCriticalPath),
        [todos]
    );

    const totalEstimatedDays = useMemo(() => {
        if (todos.length === 0) return 0;

        const taskFinishTimes = todos.map(task => {
            if (task.earliestStartDate) {
                const startMs = new Date(task.earliestStartDate).getTime();
                const durationMs = (task.estimatedDays || 1) * 24 * 60 * 60 * 1000;
                return startMs + durationMs;
            } else {
                return (task.estimatedDays || 1) * 24 * 60 * 60 * 1000;
            }
        });

        if (taskFinishTimes.length > 0) {
            const maxFinishTime = Math.max(...taskFinishTimes);
            const projectStartTime = Math.min(...todos
                .filter(t => !t.dependencies || t.dependencies.length === 0)
                .map(t => t.earliestStartDate ? new Date(t.earliestStartDate).getTime() : 0));

            return Math.ceil((maxFinishTime - projectStartTime) / (24 * 60 * 60 * 1000));
        }

        return 0;
    }, [todos]);

    const recalculateCriticalPath = async () => {
        setIsRecalculating(true);
        try {
            await fetch('/api/todos/critical-path', { method: 'POST' });
            // Parent component should refresh todos after this
        } catch (error) {
            console.error('Failed to recalculate critical path:', error);
        } finally {
            setIsRecalculating(false);
        }
    };

    return {
        criticalPath,
        criticalPathTasks,
        totalEstimatedDays,
        isRecalculating,
        recalculateCriticalPath
    };
}