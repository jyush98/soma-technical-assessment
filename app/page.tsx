// app/page.tsx
"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';
import TodoItem from '@/components/ToDoItem';
import AddToDoForm from '@/components/AddToDoForm';
import EmptyState from '@/components/EmptyState';
import DependencyGraph from '@/components/DependencyGraph';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [criticalPath, setCriticalPath] = useState<number[]>([]);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    fetchTodos();
    fetchCriticalPath();
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

  const fetchCriticalPath = async () => {
    try {
      const res = await fetch('/api/todos/critical-path');
      const data = await res.json();
      if (data.isValid) {
        setCriticalPath(data.criticalPath || []);
      }
    } catch (error) {
      console.error('Failed to fetch critical path:', error);
    }
  };

  // Updated to handle all the new fields
  const handleAddTodo = async (
    title: string,
    dueDate: string | null,
    estimatedDays: number,
    dependencies: number[]
  ) => {
    setIsAddingTodo(true);
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          dueDate,
          estimatedDays,
          dependencies
        }),
      });
      await fetchTodos();
      await fetchCriticalPath();
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
      await fetchTodos();
      await fetchCriticalPath();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleUpdate = async () => {
    await fetchTodos();
    await fetchCriticalPath();
  };

  const handleImageUpdate = (todoId: number, imageData: { imageUrl: string; imageAlt: string }) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === todoId
          ? { ...todo, imageUrl: imageData.imageUrl, imageAlt: imageData.imageAlt, imageLoading: false }
          : todo
      )
    );
  };

  const handleRecalculateCriticalPath = async () => {
    try {
      await fetch('/api/todos/critical-path', { method: 'POST' });
      await handleUpdate();
    } catch (error) {
      console.error('Failed to recalculate critical path:', error);
    }
  };

  const criticalPathTasks = todos.filter(todo => todo.isOnCriticalPath);
  const totalEstimatedDays = criticalPathTasks.reduce((sum, todo) => sum + (todo.estimatedDays || 1), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="container mx-auto px-6 py-12 max-w-7xl">

        {/* Enhanced Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light text-gray-800 mb-4 tracking-tight">
            Task Manager
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
            Stay organized, track dependencies, and manage your critical path with style
          </p>
        </div>

        {/* Enhanced Critical Path Summary */}
        {criticalPathTasks.length > 0 && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center mb-2">
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-xl font-semibold">Critical Path Analysis</h3>
                  </div>
                  <p className="text-red-100">
                    <span className="font-medium">{criticalPathTasks.length}</span> critical task{criticalPathTasks.length !== 1 ? 's' : ''} •
                    <span className="font-medium ml-2">{totalEstimatedDays}</span> day{totalEstimatedDays !== 1 ? 's' : ''} minimum duration
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowGraph(!showGraph)}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 border border-white/20"
                  >
                    {showGraph ? 'Hide' : 'Show'} Graph
                  </button>
                  <button
                    onClick={handleRecalculateCriticalPath}
                    className="px-6 py-3 bg-white text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Recalculate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dependency Graph Section */}
        {showGraph && (
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Dependency Graph</h3>
              </div>
              <DependencyGraph
                todos={todos}
                criticalPath={criticalPath}
                onUpdate={handleUpdate}
              />
            </div>
          </div>
        )}

        {/* Add Todo Form Section */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Add New Task</h3>
            </div>
            <AddToDoForm
              onAddTodo={handleAddTodo}
              isLoading={isAddingTodo}
              existingTodos={todos} // Pass existing todos for dependency selection
            />
          </div>
        </div>

        {/* Enhanced Todo List Section */}
        <div className="mb-12">
          {todos.length === 0 ? (
            <div className="flex justify-center">
              <EmptyState />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-gray-800">Your Tasks</h2>
                <div className="text-sm text-gray-500">
                  {todos.length} total • {todos.filter(t => t.completed).length} completed
                </div>
              </div>

              {/* Improved grid with better spacing */}
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                {todos.map((todo: Todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    allTodos={todos}
                    onDelete={handleDeleteTodo}
                    onImageUpdate={handleImageUpdate}
                    onUpdate={handleUpdate}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Enhanced Stats Section */}
        {todos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/60 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">Total Tasks</h4>
                  <p className="text-3xl font-light text-blue-600 mt-1">{todos.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/60 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">Completed</h4>
                  <p className="text-3xl font-light text-green-600 mt-1">
                    {todos.filter(t => t.completed).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/60 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">Critical Path</h4>
                  <p className="text-3xl font-light text-red-600 mt-1">{criticalPathTasks.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200/60 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">Project Duration</h4>
                  <p className="text-3xl font-light text-purple-600 mt-1">
                    {totalEstimatedDays} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}