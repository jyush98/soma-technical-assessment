// app/page.tsx
"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';
import TodoItem from '@/components/ToDoItem';
import AddToDoForm from '@/components/AddToDoForm';
import EmptyState from '@/components/EmptyState';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isAddingTodo, setIsAddingTodo] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const handleAddTodo = async (title: string, dueDate: string | null) => {
    setIsAddingTodo(true);
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          dueDate
        }),
      });
      fetchTodos();
    } catch (error) {
      console.error('Failed to add todo:', error);
    } finally {
      setIsAddingTodo(false);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleImageUpdate = (todoId: number, imageData: { imageUrl: string; imageAlt: string }) => {
    // Update the local state to reflect the new image data
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === todoId
          ? { ...todo, imageUrl: imageData.imageUrl, imageAlt: imageData.imageAlt, imageLoading: false }
          : todo
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-800 mb-2">Tasks</h1>
          <p className="text-gray-500 text-sm">Stay organized and productive</p>
        </div>

        {/* Add Todo Form */}
        <AddToDoForm
          onAddTodo={handleAddTodo}
          isLoading={isAddingTodo}
        />

        {/* Todo List */}
        <div className="space-y-4">
          {todos.length === 0 ? (
            <EmptyState />
          ) : (
            todos.map((todo: Todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onDelete={handleDeleteTodo}
                onImageUpdate={handleImageUpdate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}