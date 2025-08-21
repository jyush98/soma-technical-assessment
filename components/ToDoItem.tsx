// components/TodoItem.tsx
'use client';

import { TodoWithRelations } from '@/lib/types';
import { useState, useEffect } from 'react';
import EditToDoModal from './EditToDoModal';

interface TodoItemProps {
    todo: TodoWithRelations;
    allTodos: TodoWithRelations[];
    onDelete: (id: number) => void;
    onImageUpdate: (todoId: number, imageData: { imageUrl: string; imageAlt: string }) => void;
    onUpdate: () => void;
}

export default function TodoItem({
    todo,
    allTodos,
    onDelete,
    onImageUpdate,
    onUpdate
}: TodoItemProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);

    // Poll for image updates if loading
    useEffect(() => {
        if (todo.imageLoading) {
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/todos/${todo.id}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (!data.imageLoading && data.imageUrl) {
                            onImageUpdate(todo.id, {
                                imageUrl: data.imageUrl,
                                imageAlt: data.imageAlt || ''
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error polling for image:', error);
                }
            }, 2000); // Poll every 2 seconds

            // Clear interval after 30 seconds (timeout)
            const timeout = setTimeout(() => {
                clearInterval(interval);
                onUpdate(); // Refresh to clear loading state
            }, 30000);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [todo.imageLoading, todo.id, onImageUpdate, onUpdate]);

    const handleToggleComplete = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening modal
        try {
            await fetch(`/api/todos/${todo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !todo.completed })
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening modal
        if (confirm('Are you sure you want to delete this task?')) {
            onDelete(todo.id);
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't open modal if clicking on checkbox or delete button
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
            return;
        }
        setIsEditModalOpen(true);
    };

    const formatDate = (date: string | null) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
    const isDueSoon = todo.dueDate &&
        new Date(todo.dueDate) > new Date() &&
        new Date(todo.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
        !todo.completed;

    // Card styling based on state
    const getCardClasses = () => {
        const baseClasses = "group relative bg-white rounded-xl shadow-sm border transition-all duration-300 ease-out cursor-pointer";

        if (todo.completed) {
            return `${baseClasses} border-gray-200 bg-gray-50/50 transform scale-[0.98] opacity-75`;
        }

        if (todo.isOnCriticalPath) {
            return `${baseClasses} border-red-200 shadow-red-100/50 ${isHovered ? 'shadow-lg shadow-red-200/30 -translate-y-1' : ''}`;
        }

        return `${baseClasses} border-gray-200/60 ${isHovered ? 'shadow-lg shadow-gray-200/50 -translate-y-1 border-gray-300' : 'hover:border-gray-300/80'}`;
    };

    return (
        <>
            <div
                className={getCardClasses()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleCardClick}
            >
                {/* Completed overlay */}
                {todo.completed && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
                )}

                <div className="relative p-6">
                    {/* Critical Path Badge */}
                    {todo.isOnCriticalPath && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg border-2 border-white z-10">
                            <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>Critical</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                            {/* Checkbox */}
                            <button
                                onClick={handleToggleComplete}
                                className={`mt-1.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 transform hover:scale-110 ${todo.completed
                                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-500 text-white shadow-lg shadow-green-500/25'
                                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50 active:scale-95'
                                    }`}
                            >
                                {todo.completed && (
                                    <svg className="w-4 h-4 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-xl font-semibold leading-tight transition-all duration-200 ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900 group-hover:text-gray-800'
                                    }`}>
                                    {todo.title}
                                </h3>

                                {/* Metadata */}
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {/* Due Date */}
                                    {todo.dueDate && (
                                        <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' :
                                                isDueSoon ? 'text-orange-600 font-medium' :
                                                    'text-gray-600'
                                            }`}>
                                            <span className="inline-flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {formatDate(todo.dueDate.toString())}
                                                {isOverdue && ' (Overdue)'}
                                                {isDueSoon && ' (Soon)'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Estimated Days */}
                                    {todo.estimatedDays && (
                                        <div className="text-sm text-blue-600">
                                            <span className="inline-flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {todo.estimatedDays} day{todo.estimatedDays !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}

                                    {/* Dependencies count */}
                                    {todo.dependencies && todo.dependencies.length > 0 && (
                                        <div className="text-sm text-purple-600">
                                            <span className="inline-flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                                {todo.dependencies.length} dep{todo.dependencies.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}

                                    {/* Earliest Start Date */}
                                    {todo.earliestStartDate && (
                                        <div className="text-sm text-purple-600">
                                            <span className="inline-flex items-center">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                                </svg>
                                                Start: {formatDate(todo.earliestStartDate.toString())}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={handleDelete}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 z-10"
                            title="Delete Task"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                    {/* Image Display */}
                    {(todo.imageUrl || todo.imageLoading) && (
                        <div className="mt-6 relative">
                            <div className="relative overflow-hidden rounded-xl shadow-md border border-gray-200">
                                {todo.imageLoading ? (
                                    // Loading state
                                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                        <div className="text-center">
                                            <svg className="w-8 h-8 animate-spin mx-auto text-gray-400" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <p className="text-sm text-gray-500 mt-2">Generating image...</p>
                                        </div>
                                    </div>
                                ) : todo.imageUrl && !imageLoadError ? (
                                    // Image display
                                    <img
                                        src={todo.imageUrl}
                                        alt={todo.imageAlt || 'Task image'}
                                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                                        onError={() => setImageLoadError(true)}
                                    />
                                ) : (
                                    // Error or no image state
                                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                        <div className="text-center text-gray-400">
                                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm mt-2">No image available</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <EditToDoModal
                todo={todo}
                allTodos={allTodos}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={onUpdate}
            />
        </>
    );
}