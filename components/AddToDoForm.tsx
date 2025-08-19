// components/AddToDoForm.tsx
'use client';

import { useState } from 'react';

interface AddToDoFormProps {
    onAddTodo: (title: string, dueDate: string | null) => void;
    isLoading?: boolean;
}

export default function AddToDoForm({ onAddTodo, isLoading = false }: AddToDoFormProps) {
    const [newTodo, setNewTodo] = useState('');
    const [newDueDate, setNewDueDate] = useState('');

    const handleSubmit = () => {
        if (!newTodo.trim()) return;

        onAddTodo(newTodo, newDueDate || null);
        setNewTodo('');
        setNewDueDate('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                    placeholder="What needs to be done?"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!newTodo.trim() || isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Adding...
                        </>
                    ) : (
                        'Add Task'
                    )}
                </button>
            </div>
        </div>
    );
}