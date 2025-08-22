// hooks/useDependencies.ts
import { useState } from 'react';

export function useDependencies() {
    const [isUpdating, setIsUpdating] = useState(false);

    const addDependency = async (todoId: number, dependsOnId: number) => {
        setIsUpdating(true);
        try {
            const response = await fetch(`/api/todos/${todoId}/dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dependsOnId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add dependency');
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to add dependency:', error);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    const removeDependency = async (todoId: number, dependsOnId: number) => {
        setIsUpdating(true);
        try {
            const response = await fetch(`/api/todos/${todoId}/dependencies?dependsOnId=${dependsOnId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to remove dependency');
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to remove dependency:', error);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        isUpdating,
        addDependency,
        removeDependency
    };
}