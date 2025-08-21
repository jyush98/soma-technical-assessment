// components/ReadyToStartCard.tsx
'use client';

import { TodoWithRelations } from '@/lib/types';

interface ReadyToStartCardProps {
    todo: TodoWithRelations;
    onToggleComplete: (id: number) => void;
    onClick: () => void;
}

export default function ReadyToStartCard({ todo, onToggleComplete, onClick }: ReadyToStartCardProps) {
    const formatDate = (date: string | null) => {
        if (!date) return null;
        // Parse the date string directly to avoid timezone issues
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
    };

    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

    return (
        <div
            className={`p-4 bg-white rounded-lg border transition-all cursor-pointer hover:shadow-md ${todo.isOnCriticalPath
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200'
                }`}
            onClick={onClick}
        >
            <div className="flex items-start space-x-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(todo.id);
                    }}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${todo.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                >
                    {todo.completed && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-gray-900 truncate ${todo.completed ? 'line-through text-gray-500' : ''
                        }`}>
                        {todo.title}
                    </h4>

                    <div className="flex items-center mt-1 text-xs text-gray-600 space-x-2">
                        <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {todo.estimatedDays}d
                        </span>

                        {todo.dueDate && (
                            <span className={`flex items-center ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(todo.dueDate.toString())}
                            </span>
                        )}
                    </div>

                    {todo.isOnCriticalPath && (
                        <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Critical Path
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}