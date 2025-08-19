// components/TodoItem.tsx
'use client';

import { Todo } from '@prisma/client';
import TodoImage from './ToDoImage';

interface TodoItemProps {
    todo: Todo;
    onDelete: (id: number) => void;
    onImageUpdate?: (todoId: number, imageData: { imageUrl: string; imageAlt: string }) => void;
}

export default function TodoItem({ todo, onDelete, onImageUpdate }: TodoItemProps) {
    const formatDueDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const actualDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });

        if (diffDays === 0) return { status: 'Due today', date: actualDate };
        if (diffDays === 1) return { status: 'Due tomorrow', date: actualDate };
        if (diffDays === -1) return { status: 'Due yesterday', date: actualDate };
        if (diffDays < 0) return { status: `${Math.abs(diffDays)} days overdue`, date: actualDate };
        if (diffDays <= 7) return { status: `Due in ${diffDays} days`, date: actualDate };

        return { status: '', date: actualDate };
    };

    const isOverdue = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return date < today;
    };

    const dueDateInfo = todo.dueDate ? formatDueDate(todo.dueDate.toString()) : null;
    const overdue = todo.dueDate ? isOverdue(todo.dueDate.toString()) : false;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex gap-4">
                {/* Image Section */}
                <div className="w-32 flex-shrink-0">
                    <TodoImage
                        todoId={todo.id}
                        todoTitle={todo.title}
                        imageUrl={todo.imageUrl}
                        imageAlt={todo.imageAlt}
                        isLoading={todo.imageLoading}
                        onImageLoad={(imageData) => {
                            onImageUpdate?.(todo.id, imageData);
                        }}
                    />
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-gray-800 font-medium text-lg leading-tight mb-2">
                                {todo.title}
                            </h3>

                            {dueDateInfo && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${overdue
                                            ? 'bg-red-50 text-red-700 border border-red-200'
                                            : dueDateInfo.status.includes('today') || dueDateInfo.status.includes('tomorrow')
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {dueDateInfo.status || dueDateInfo.date}
                                    </div>
                                    {dueDateInfo.status && (
                                        <span className="text-gray-500 text-sm">
                                            {dueDateInfo.date}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => onDelete(todo.id)}
                            className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200 flex-shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}