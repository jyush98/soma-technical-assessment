// components/EditToDoModal.tsx
'use client';

import { TodoWithRelations } from '@/lib/types';
import { useState, useEffect } from 'react';

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
    const [estimatedDays, setEstimatedDays] = useState(todo.estimatedDays || 1);
    const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form when modal opens or todo changes
    useEffect(() => {
        if (isOpen) {
            setTitle(todo.title);
            setEstimatedDays(todo.estimatedDays || 1);

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
            }
        } catch (error) {
            console.error('Failed to fetch dependencies:', error);
        }
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
                    estimatedDays,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update todo');
            }

            // Then update dependencies
            await updateDependencies();

            // Refresh the parent component
            await onUpdate();

            // Close modal
            onClose();
        } catch (error) {
            console.error('Error updating todo:', error);
            setError('Failed to update task. Please try again.');
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
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to add dependency');
                }
            }

            // Remove old dependencies
            for (const dependsOnId of toRemove) {
                const response = await fetch(`/api/todos/${todo.id}/dependencies?dependsOnId=${dependsOnId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to remove dependency');
                }
            }
        } catch (error) {
            console.error('Error updating dependencies:', error);
            throw error;
        }
    };

    const handleDependencyToggle = (todoId: number) => {
        setSelectedDependencies(prev =>
            prev.includes(todoId)
                ? prev.filter(id => id !== todoId)
                : [...prev, todoId]
        );
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
                                {error}
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
                                onChange={(e) => setEstimatedDays(parseInt(e.target.value) || 1)}
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
                            </label>
                            {availableTodos.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">
                                    No available tasks to depend on
                                </p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                                    {availableTodos.map(t => (
                                        <label
                                            key={t.id}
                                            className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedDependencies.includes(t.id)}
                                                onChange={() => handleDependencyToggle(t.id)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                disabled={isLoading}
                                            />
                                            <span className="ml-3 text-sm text-gray-700">
                                                {t.title}
                                                {t.estimatedDays && (
                                                    <span className="text-gray-500 ml-2">
                                                        ({t.estimatedDays} days)
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    ))}
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