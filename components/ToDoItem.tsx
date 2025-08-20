// components/TodoItem.tsx
'use client';

import { Todo } from '@prisma/client';
import { useState } from 'react';
import DependencyManager from './DependencyManager';

interface TodoItemProps {
    todo: Todo;
    allTodos: Todo[];
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
    const [isDependencyManagerOpen, setIsDependencyManagerOpen] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleToggleComplete = async () => {
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

    const handleGenerateImage = async () => {
        setIsLoadingImage(true);
        try {
            const response = await fetch(`/api/todos/${todo.id}/image`, {
                method: 'POST'
            });

            if (response.ok) {
                const imageData = await response.json();
                onImageUpdate(todo.id, imageData);
            }
        } catch (error) {
            console.error('Failed to generate image:', error);
        } finally {
            setIsLoadingImage(false);
        }
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

    // Enhanced styling based on todo state
    const getCardClasses = () => {
        const baseClasses = "group relative bg-white rounded-xl shadow-sm border transition-all duration-300 ease-out";

        if (todo.completed) {
            return `${baseClasses} border-gray-200 bg-gray-50/50 transform scale-[0.98] opacity-75`;
        }

        if (todo.isOnCriticalPath) {
            return `${baseClasses} border-red-200 shadow-red-100/50 ${isHovered ? 'shadow-lg shadow-red-200/30 -translate-y-1' : ''
                }`;
        }

        return `${baseClasses} border-gray-200/60 ${isHovered ? 'shadow-lg shadow-gray-200/50 -translate-y-1 border-gray-300' : 'hover:border-gray-300/80'
            }`;
    };

    const getDueDateClasses = () => {
        if (isOverdue) return "text-red-600 bg-red-100/80 border-red-200";
        if (isDueSoon) return "text-orange-600 bg-orange-100/80 border-orange-200";
        return "text-gray-600 bg-gray-100/60 border-gray-200";
    };

    return (
        <>
            <div
                className={getCardClasses()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Subtle gradient overlay for completed items */}
                {todo.completed && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
                )}

                <div className="relative p-6">
                    {/* Critical Path Badge */}
                    {todo.isOnCriticalPath && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg border-2 border-white">
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
                            {/* Enhanced Checkbox */}
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

                            {/* Enhanced Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-xl font-semibold leading-tight transition-all duration-200 ${todo.completed
                                    ? 'text-gray-500 line-through'
                                    : 'text-gray-900 group-hover:text-gray-800'
                                    }`}>
                                    {todo.title}
                                </h3>

                                {/* Date Information - Simple Text */}
                                <div className="mt-3 space-y-1">
                                    {/* Due Date */}
                                    {todo.dueDate && (
                                        <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' :
                                            isDueSoon ? 'text-orange-600 font-medium' :
                                                'text-gray-600'
                                            }`}>
                                            Due: {formatDate(todo.dueDate.toString())}
                                            {isOverdue && ' (Overdue)'}
                                            {isDueSoon && ' (Due Soon)'}
                                        </div>
                                    )}

                                    {/* Earliest Start Date */}
                                    {todo.earliestStartDate && (
                                        <div className="text-sm text-purple-600">
                                            Earliest start: {formatDate(todo.earliestStartDate.toString())}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Action Buttons */}
                        <div className="flex items-center space-x-1 ml-4">
                            {/* Dependencies Button */}
                            <button
                                onClick={() => setIsDependencyManagerOpen(true)}
                                className="group/btn p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                                title="Manage Dependencies"
                            >
                                <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </button>

                            {/* Image Button */}
                            <button
                                onClick={handleGenerateImage}
                                disabled={isLoadingImage || todo.imageLoading}
                                className="group/btn p-3 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                title="Generate Image"
                            >
                                {isLoadingImage || todo.imageLoading ? (
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>

                            {/* Delete Button */}
                            <button
                                onClick={() => onDelete(todo.id)}
                                className="group/btn p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                                title="Delete Task"
                            >
                                <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Image Display */}
                    {todo.imageUrl && (
                        <div className="mt-6 relative">
                            {/* Estimated Days Badge - Top Right Corner */}
                            {todo.estimatedDays && (
                                <div className="absolute -top-3 right-0 z-10 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg border-2 border-white">
                                    <div className="flex items-center space-x-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{todo.estimatedDays}d</span>
                                    </div>
                                </div>
                            )}

                            <div className="relative group/image overflow-hidden rounded-xl shadow-lg border border-gray-200">
                                <img
                                    src={todo.imageUrl}
                                    alt={todo.imageAlt || 'Task image'}
                                    className="w-full h-56 object-cover transition-transform duration-300 group-hover/image:scale-105"
                                />
                                {/* Image overlay on hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors duration-300" />

                                {/* Image actions overlay */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200">
                                    <button className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg backdrop-blur-sm transition-colors">
                                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Subtle bottom border for visual separation */}
                <div className="h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50" />
            </div>

            {/* Dependency Manager Modal */}
            <DependencyManager
                todo={todo}
                allTodos={allTodos}
                isOpen={isDependencyManagerOpen}
                onClose={() => setIsDependencyManagerOpen(false)}
                onUpdate={onUpdate}
            />
        </>
    );
}