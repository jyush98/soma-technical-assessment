// hooks/useReadyTasks.ts
import { useMemo } from 'react';
import { TodoWithRelations } from '@/lib/types';

export function useReadyTasks(todos: TodoWithRelations[], maxTasks = 5) {
    const readyToStartTasks = useMemo(() => {
        return todos.filter(todo => {
            if (todo.completed) return false;

            // Check if all dependencies are completed
            if (!todo.dependencies || todo.dependencies.length === 0) {
                return true;
            }

            return todo.dependencies.every(dep => {
                const dependencyTodo = todos.find(t => t.id === dep.dependsOnId);
                return dependencyTodo?.completed === true;
            });
        })
            .sort((a, b) => {
                // Sort by critical path first, then by duration
                if (a.isOnCriticalPath && !b.isOnCriticalPath) return -1;
                if (!a.isOnCriticalPath && b.isOnCriticalPath) return 1;
                return (b.estimatedDays || 1) - (a.estimatedDays || 1);
            })
            .slice(0, maxTasks);
    }, [todos, maxTasks]);

    const totalReadyTasks = useMemo(() => {
        return todos.filter(todo => {
            if (todo.completed) return false;
            if (!todo.dependencies || todo.dependencies.length === 0) return true;
            return todo.dependencies.every(dep => {
                const dependencyTodo = todos.find(t => t.id === dep.dependsOnId);
                return dependencyTodo?.completed === true;
            });
        }).length;
    }, [todos]);

    return {
        readyToStartTasks,
        totalReadyTasks,
        hasMoreReadyTasks: totalReadyTasks > maxTasks
    };
}