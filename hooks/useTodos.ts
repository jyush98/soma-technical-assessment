// hooks/useTodos.ts
import { useState, useCallback } from 'react';
import { TodoWithRelations } from '@/lib/types';

export function useTodos() {
    const [todos, setTodos] = useState<TodoWithRelations[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingTodo, setIsAddingTodo] = useState(false);

    const fetchTodos = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/todos');
            const data = await res.json();
            setTodos(data);
        } catch (error) {
            console.error('Failed to fetch todos:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addTodo = async (
        title: string,
        dueDate: string | null,
        estimatedDays: number,
        dependencies: number[]
    ) => {
        setIsAddingTodo(true);
        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    dueDate,
                    estimatedDays,
                    dependencies
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.todos) {
                    setTodos(data.todos);
                } else {
                    await fetchTodos();
                }
                return { success: true };
            } else {
                throw new Error('Failed to add todo');
            }
        } catch (error) {
            console.error('Failed to add todo:', error);
            await fetchTodos();
            return { success: false, error };
        } finally {
            setIsAddingTodo(false);
        }
    };

    const deleteTodo = async (id: number) => {
        try {
            await fetch(`/api/todos/${id}`, {
                method: 'DELETE',
            });
            await fetchTodos();
        } catch (error) {
            console.error('Failed to delete todo:', error);
        }
    };

    const toggleComplete = async (id: number) => {
        try {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;

            await fetch(`/api/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !todo.completed })
            });
            await fetchTodos();
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    };

    const updateImageData = (todoId: number, imageData: { imageUrl: string; imageAlt: string }) => {
        setTodos(prevTodos =>
            prevTodos.map(todo =>
                todo.id === todoId
                    ? { ...todo, imageUrl: imageData.imageUrl, imageAlt: imageData.imageAlt, imageLoading: false }
                    : todo
            )
        );
    };

    return {
        todos,
        isLoading,
        isAddingTodo,
        fetchTodos,
        addTodo,
        deleteTodo,
        toggleComplete,
        updateImageData
    };
}