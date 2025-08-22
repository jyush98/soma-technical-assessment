// hooks/useOptimisticTodos.ts
import { useState, useCallback } from 'react';
import { TodoWithRelations } from '@/lib/types';

export function useOptimisticTodos(initialTodos: TodoWithRelations[]) {
    const [optimisticTodos, setOptimisticTodos] = useState(initialTodos);
    const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

    // Update optimistic todos when real todos change
    const syncTodos = useCallback((realTodos: TodoWithRelations[]) => {
        if (pendingActions.size === 0) {
            setOptimisticTodos(realTodos);
        }
    }, [pendingActions]);

    const optimisticToggleComplete = useCallback(async (
        id: number,
        actualToggle: () => Promise<void>
    ) => {
        const actionKey = `toggle-${id}`;

        // Optimistic update
        setOptimisticTodos(prev => prev.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));

        setPendingActions(prev => new Set(prev).add(actionKey));

        try {
            await actualToggle();
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(actionKey);
                return next;
            });
        }
    }, []);

    const optimisticDelete = useCallback(async (
        id: number,
        actualDelete: () => Promise<void>
    ) => {
        const actionKey = `delete-${id}`;
        const originalTodos = optimisticTodos;

        // Optimistic update
        setOptimisticTodos(prev => prev.filter(todo => todo.id !== id));
        setPendingActions(prev => new Set(prev).add(actionKey));

        try {
            await actualDelete();
        } catch (error) {
            // Rollback on error
            setOptimisticTodos(originalTodos);
            throw error;
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(actionKey);
                return next;
            });
        }
    }, [optimisticTodos]);

    return {
        optimisticTodos,
        pendingActions,
        syncTodos,
        optimisticToggleComplete,
        optimisticDelete,
        hasPendingActions: pendingActions.size > 0
    };
}