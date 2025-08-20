// components/DependencyManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@prisma/client';

interface TodoDependency {
    id: number;
    todoId: number;
    dependsOnId: number;
    dependsOn: {
        id: number;
        title: string;
        completed: boolean;
    };
}

interface DependencyManagerProps {
    todo: Todo;
    allTodos: Todo[];
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Callback to refresh todo list
}

export default function DependencyManager({
    todo,
    allTodos,
    isOpen,
    onClose,
    onUpdate
}: DependencyManagerProps) {
    const [dependencies, setDependencies] = useState<TodoDependency[]>([]);
    const [selectedDependency, setSelectedDependency] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
        }
    }, [isOpen, todo.id]);

    const fetchDependencies = async () => {
        try {
            const res = await fetch(`/api/todos/${todo.id}/dependencies`);
            const data = await res.json();
            setDependencies(data);
        } catch (error) {
            console.error('Error fetching dependencies:', error);
            setError('Failed to load dependencies');
        }
    };

    // Filter out current todo and existing dependencies
    const availableForDependency = allTodos.filter(t =>
        t.id !== todo.id &&
        !dependencies.some(dep => dep.dependsOnId === t.id)
    );

    const handleAddDependency = async () => {
        if (!selectedDependency) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/todos/${todo.id}/dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dependsOnId: selectedDependency })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || errorData.error || 'Failed to add dependency');
            }

            setSelectedDependency(null);
            await fetchDependencies();
            onUpdate(); // Refresh parent component
        } catch (error: any) {
            console.error('Error adding dependency:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveDependency = async (dependsOnId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/todos/${todo.id}/dependencies?dependsOnId=${dependsOnId}`,
                { method: 'DELETE' }
            );

            if (!res.ok) {
                throw new Error('Failed to remove dependency');
            }

            await fetchDependencies();
            onUpdate(); // Refresh parent component
        } catch (error: any) {
            console.error('Error removing dependency:', error);
            setError('Failed to remove dependency');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                            Manage Dependencies
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        "{todo.title}"
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-64 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Current Dependencies */}
                    <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">Current Dependencies</h4>
                        {dependencies.length === 0 ? (
                            <p className="text-gray-500 text-sm">No dependencies</p>
                        ) : (
                            <div className="space-y-2">
                                {dependencies.map(dep => (
                                    <div
                                        key={dep.id}
                                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm">{dep.dependsOn.title}</span>
                                            {dep.dependsOn.completed && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveDependency(dep.dependsOnId)}
                                            disabled={isLoading}
                                            className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Dependency */}
                    {availableForDependency.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">Add Dependency</h4>
                            <div className="space-y-2">
                                <select
                                    value={selectedDependency || ''}
                                    onChange={(e) => setSelectedDependency(Number(e.target.value) || null)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a task this depends on...</option>
                                    {availableForDependency.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title} {t.completed ? '(Completed)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAddDependency}
                                    disabled={!selectedDependency || isLoading}
                                    className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Adding...' : 'Add Dependency'}
                                </button>
                            </div>
                        </div>
                    )}

                    {availableForDependency.length === 0 && dependencies.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">
                            No other tasks available for dependencies
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}