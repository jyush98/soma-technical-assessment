// components/AddToDoForm.tsx
'use client';

import { useState } from 'react';
import { Todo } from '@prisma/client';

interface AddToDoFormProps {
    onAddTodo: (title: string, dueDate: string | null, estimatedDays: number, dependencies: number[]) => void;
    isLoading?: boolean;
    existingTodos?: Todo[];
}

export default function AddToDoForm({ onAddTodo, isLoading = false, existingTodos = [] }: AddToDoFormProps) {
    const [newTodo, setNewTodo] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [estimatedDays, setEstimatedDays] = useState(1);
    const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Filter out completed todos from dependency options
    const availableDependencies = existingTodos.filter(todo => !todo.completed);

    const handleSubmit = () => {
        if (!newTodo.trim()) return;

        onAddTodo(newTodo, newDueDate || null, estimatedDays, selectedDependencies);

        // Reset form
        setNewTodo('');
        setNewDueDate('');
        setEstimatedDays(1);
        setSelectedDependencies([]);
        setShowAdvanced(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !showAdvanced) {
            handleSubmit();
        }
    };

    const toggleDependency = (todoId: number) => {
        setSelectedDependencies(prev =>
            prev.includes(todoId)
                ? prev.filter(id => id !== todoId)
                : [...prev, todoId]
        );
    };

    const getSelectedDependencyNames = () => {
        return selectedDependencies
            .map(id => existingTodos.find(todo => todo.id === id)?.title)
            .filter(Boolean)
            .join(', ');
    };

    return (
        <div className="space-y-4">
            {/* Basic Fields */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                    <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-2">
                        Task Title *
                    </label>
                    <input
                        id="task-title"
                        type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                        placeholder="What needs to be done?"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                </div>

                <div className="lg:w-48">
                    <label htmlFor="due-date" className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date
                    </label>
                    <input
                        id="due-date"
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                        disabled={isLoading}
                    />
                </div>

                <div className="lg:w-40">
                    <label htmlFor="estimated-days" className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (days) *
                    </label>
                    <input
                        id="estimated-days"
                        type="number"
                        min="1"
                        max="365"
                        value={estimatedDays}
                        onChange={(e) => setEstimatedDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Advanced Options Toggle */}
            {availableDependencies.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center transition-colors"
                        disabled={isLoading}
                    >
                        <svg
                            className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {showAdvanced ? 'Hide' : 'Show'} Dependencies
                        {selectedDependencies.length > 0 && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {selectedDependencies.length}
                            </span>
                        )}
                    </button>

                    {selectedDependencies.length > 0 && !showAdvanced && (
                        <div className="text-xs text-gray-500 max-w-md truncate">
                            Depends on: {getSelectedDependencyNames()}
                        </div>
                    )}
                </div>
            )}

            {/* Dependencies Section */}
            {showAdvanced && availableDependencies.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Task Dependencies
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                        Select tasks that must be completed before this task can start
                    </p>

                    {availableDependencies.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No available tasks to depend on</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {availableDependencies.map(todo => (
                                <label
                                    key={todo.id}
                                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedDependencies.includes(todo.id)}
                                        onChange={() => toggleDependency(todo.id)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        disabled={isLoading}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {todo.title}
                                            </span>
                                            {todo.estimatedDays && (
                                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                                    {todo.estimatedDays}d
                                                </span>
                                            )}
                                            {todo.isOnCriticalPath && (
                                                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                                    Critical
                                                </span>
                                            )}
                                        </div>
                                        {todo.dueDate && (
                                            <div className="text-xs text-gray-500">
                                                Due: {new Date(todo.dueDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSubmit}
                    disabled={!newTodo.trim() || isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Adding Task...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Task
                        </>
                    )}
                </button>
            </div>

            {/* Form Validation Helper */}
            {newTodo.trim() && estimatedDays > 0 && (
                <div className="text-xs text-gray-500 text-center">
                    Ready to create: "{newTodo}" • {estimatedDays} day{estimatedDays !== 1 ? 's' : ''}
                    {selectedDependencies.length > 0 && ` • ${selectedDependencies.length} dependencies`}
                </div>
            )}
        </div>
    );
}