// components/EditToDoModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { TodoWithRelations } from '@/lib/types';
import { DependencyGraphService } from '@/lib/dependency-graph';

interface EditToDoModalProps {
    todo: TodoWithRelations;
    allTodos: TodoWithRelations[];
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function EditToDoModal({
    todo,
    allTodos,
    isOpen,
    onClose,
    onUpdate
}: EditToDoModalProps) {
    const [title, setTitle] = useState(todo.title);
    const [dueDate, setDueDate] = useState('');
    const [estimatedDays, setEstimatedDays] = useState<number | ''>(todo.estimatedDays || 1);
    const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
    const [invalidDependencies, setInvalidDependencies] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form when modal opens or todo changes
    useEffect(() => {
        if (isOpen) {
            setTitle(todo.title);
            setEstimatedDays(todo.estimatedDays || 1);
            setError(null); // Clear any previous errors

            // Format date for input
            if (todo.dueDate) {
                const date = new Date(todo.dueDate);
                const formatted = date.toISOString().split('T')[0];
                setDueDate(formatted);
            } else {
                setDueDate('');
            }

            // Load current dependencies
            fetchTodoDependencies();
        }
    }, [isOpen, todo]);

    const fetchTodoDependencies = async () => {
        try {
            const response = await fetch(`/api/todos/${todo.id}`);
            if (response.ok) {
                const data = await response.json();
                const depIds = data.dependencies?.map((dep: any) => dep.dependsOnId) || [];
                setSelectedDependencies(depIds);

                // Check which dependencies would create cycles
                checkInvalidDependencies(depIds);
            }
        } catch (error) {
            console.error('Failed to fetch dependencies:', error);
        }
    };

    const checkInvalidDependencies = (currentDeps: number[]) => {
        const invalid = new Set<number>();

        // Transform todos to match the DependencyGraphService interface
        const todosForValidation = allTodos.map(t => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            estimatedDays: t.estimatedDays || 1,
            dependencies: t.dependencies || [],
            dependents: t.dependents || [],
            earliestStartDate: t.earliestStartDate,
            criticalPathLength: 0,
            isOnCriticalPath: t.isOnCriticalPath,
            dueDate: t.dueDate
        }));

        // Check each available todo to see if it would create a cycle
        allTodos.forEach(availableTodo => {
            if (availableTodo.id === todo.id || availableTodo.completed) {
                return; // Skip self and completed todos
            }

            // Skip if already selected (don't re-validate existing dependencies)
            if (currentDeps.includes(availableTodo.id)) {
                return;
            }

            // Check if adding this dependency would create a cycle
            const validation = DependencyGraphService.validateDependency(
                todosForValidation,
                todo.id,
                availableTodo.id
            );

            if (!validation.isValid) {
                invalid.add(availableTodo.id);
            }
        });

        setInvalidDependencies(invalid);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // First, update the todo basic info
            const response = await fetch(`/api/todos/${todo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    dueDate: dueDate || null,
                    estimatedDays: estimatedDays === '' ? 1 : estimatedDays,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update todo');
            }

            // Then update dependencies
            await updateDependencies();

            // Refresh the parent component
            await onUpdate();

            // Close modal
            onClose();
        } catch (error: any) {
            console.error('Error updating todo:', error);
            setError(error.message || 'Failed to update task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const updateDependencies = async () => {
        try {
            // Get current dependencies
            const currentResponse = await fetch(`/api/todos/${todo.id}`);
            const currentData = await currentResponse.json();
            const currentDeps = currentData.dependencies?.map((d: any) => d.dependsOnId) || [];

            // Find dependencies to add and remove
            const toAdd = selectedDependencies.filter(id => !currentDeps.includes(id));
            const toRemove = currentDeps.filter((id: number) => !selectedDependencies.includes(id));

            // Add new dependencies
            for (const dependsOnId of toAdd) {
                const response = await fetch(`/api/todos/${todo.id}/dependencies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dependsOnId }),
                });

                if (!response.ok) {
                    const errorData = await response.json();

                    // Check if it's a circular dependency error
                    if (response.status === 400 && (errorData.cycle || errorData.message?.includes('circular'))) {
                        // Get task titles for better error message
                        const cycle = errorData.cycle || [];
                        const cycleTasks = cycle.map((id: number) => {
                            const task = allTodos.find(t => t.id === id);
                            return task ? task.title : `Task ${id}`;
                        });

                        throw new Error(
                            `Cannot add dependency - it would create a circular reference:\n` +
                            `${cycleTasks.join(' → ')}\n\n` +
                            `Tasks cannot depend on each other in a circle.`
                        );
                    }

                    throw new Error(errorData.message || errorData.error || 'Failed to add dependency');
                }
            }

            // Remove old dependencies
            for (const dependsOnId of toRemove) {
                const response = await fetch(`/api/todos/${todo.id}/dependencies?dependsOnId=${dependsOnId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to remove dependency');
                }
            }
        } catch (error) {
            console.error('Error updating dependencies:', error);
            throw error;
        }
    };

    const handleDependencyToggle = (todoId: number) => {
        // Don't allow toggling invalid dependencies
        if (invalidDependencies.has(todoId)) {
            return;
        }

        const newDeps = selectedDependencies.includes(todoId)
            ? selectedDependencies.filter(id => id !== todoId)
            : [...selectedDependencies, todoId];

        setSelectedDependencies(newDeps);

        // Re-check invalid dependencies with the new selection
        checkInvalidDependencies(newDeps);
    };

    if (!isOpen) return null;

    // Get available todos for dependencies (exclude self and completed)
    const availableTodos = allTodos.filter(
        t => t.id !== todo.id && !t.completed
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
                    {/* Header */}
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Edit Task
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                <div className="flex">
                                    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div className="whitespace-pre-wrap">{error}</div>
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                Task Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                required
                                disabled={isLoading}
                            />
                            {title !== todo.title && (
                                <p className="mt-1 text-sm text-blue-600">
                                    ✨ A new image will be generated for this title
                                </p>
                            )}
                        </div>

                        {/* Due Date */}
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                                Due Date (Optional)
                            </label>
                            <input
                                type="date"
                                id="dueDate"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Estimated Days */}
                        <div>
                            <label htmlFor="estimatedDays" className="block text-sm font-medium text-gray-700 mb-2">
                                Estimated Days
                            </label>
                            <input
                                type="number"
                                id="estimatedDays"
                                value={estimatedDays}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow empty string for backspacing, but enforce minimum 1 on blur
                                    setEstimatedDays(value === '' ? '' as any : parseInt(value) || 1);
                                }}
                                onBlur={(e) => {
                                    // Enforce minimum of 1 when user leaves the field
                                    const value = parseInt(e.target.value) || 1;
                                    setEstimatedDays(Math.max(1, Math.min(365, value)));
                                }}
                                min="1"
                                max="365"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {/* Dependencies */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dependencies
                                {selectedDependencies.length > 0 && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        ({selectedDependencies.length} selected)
                                    </span>
                                )}
                            </label>
                            {availableTodos.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">
                                    No available tasks to depend on
                                </p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                                    {/* Show selected dependencies first */}
                                    {availableTodos
                                        .sort((a, b) => {
                                            // Selected items first
                                            const aSelected = selectedDependencies.includes(a.id);
                                            const bSelected = selectedDependencies.includes(b.id);
                                            if (aSelected && !bSelected) return -1;
                                            if (!aSelected && bSelected) return 1;
                                            // Then invalid items last
                                            const aInvalid = invalidDependencies.has(a.id);
                                            const bInvalid = invalidDependencies.has(b.id);
                                            if (aInvalid && !bInvalid) return 1;
                                            if (!aInvalid && bInvalid) return -1;
                                            return 0;
                                        })
                                        .map(t => {
                                            const isInvalid = invalidDependencies.has(t.id);
                                            const isSelected = selectedDependencies.includes(t.id);

                                            return (
                                                <label
                                                    key={t.id}
                                                    className={`flex items-center p-2 rounded-lg transition-colors ${isInvalid
                                                            ? 'bg-gray-50 cursor-not-allowed opacity-60'
                                                            : isSelected
                                                                ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                                                : 'hover:bg-gray-50 cursor-pointer'
                                                        }`}
                                                    title={isInvalid ? 'Would create circular dependency' : ''}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleDependencyToggle(t.id)}
                                                        className={`w-4 h-4 border-gray-300 rounded focus:ring-blue-500 ${isInvalid
                                                                ? 'text-gray-400 cursor-not-allowed'
                                                                : 'text-blue-600'
                                                            }`}
                                                        disabled={isLoading || isInvalid}
                                                    />
                                                    <span className={`ml-3 text-sm ${isInvalid ? 'text-gray-500' : 'text-gray-700'
                                                        }`}>
                                                        {t.title}
                                                        {t.estimatedDays && (
                                                            <span className="text-gray-500 ml-2">
                                                                ({t.estimatedDays} days)
                                                            </span>
                                                        )}
                                                        {isInvalid && (
                                                            <span className="ml-2 text-xs text-red-600">
                                                                (would create cycle)
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Updating...
                                    </span>
                                ) : (
                                    'Update Task'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}