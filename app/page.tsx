// app/page.tsx
"use client"
import { useState, useEffect, useCallback } from 'react';
import TodoItem from '@/components/ToDoItem';
import AddToDoForm from '@/components/AddToDoForm';
import EmptyState from '@/components/EmptyState';
import DependencyGraph from '@/components/DependencyGraph';
import { TodoWithRelations } from '@/lib/types';

export default function Home() {
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Single fetch function that gets todos with all critical path info
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async (
    title: string,
    dueDate: string | null,
    estimatedDays: number,
    dependencies: number[]
  ) => {
    setIsAddingTodo(true);
    setIsRecalculating(true);
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
        // The backend now returns all todos with updated critical path
        if (data.todos) {
          setTodos(data.todos);
        } else {
          // Fallback to fetching if response format is different
          await fetchTodos();
        }
      } else {
        throw new Error('Failed to add todo');
      }
    } catch (error) {
      console.error('Failed to add todo:', error);
      // On error, still try to fetch to ensure UI is in sync
      await fetchTodos();
    } finally {
      setIsAddingTodo(false);
      setIsRecalculating(false);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    setIsRecalculating(true);
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      // Critical path is recalculated on backend, just fetch updated todos
      await fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // This is called when any todo is updated (completion, edit, dependencies)
  const handleUpdate = useCallback(async () => {
    setIsRecalculating(true);
    await fetchTodos();
    setIsRecalculating(false);
  }, [fetchTodos]);

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
    setIsRecalculating(true);
    try {
      await fetch('/api/todos/critical-path', { method: 'POST' });
      await fetchTodos();
    } catch (error) {
      console.error('Failed to recalculate critical path:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Derive critical path info from todos  
  const criticalPath = todos.filter(todo => todo.isOnCriticalPath).map(t => t.id);
  const criticalPathTasks = todos.filter(todo => todo.isOnCriticalPath);

  // Calculate project duration based on critical path
  // The project ends when the last task finishes
  let totalEstimatedDays = 0;

  if (todos.length > 0) {
    // Find the maximum finish time across all tasks
    // This represents the actual project completion time
    const taskFinishTimes = todos.map(task => {
      if (task.earliestStartDate) {
        // Task has a calculated start date from dependencies
        const startMs = new Date(task.earliestStartDate).getTime();
        const durationMs = (task.estimatedDays || 1) * 24 * 60 * 60 * 1000;
        return startMs + durationMs;
      } else {
        // Independent task starting at day 0
        return (task.estimatedDays || 1) * 24 * 60 * 60 * 1000;
      }
    });

    if (taskFinishTimes.length > 0) {
      const maxFinishTime = Math.max(...taskFinishTimes);
      // Find the earliest start time (project start)
      const projectStartTime = Math.min(...todos
        .filter(t => !t.dependencies || t.dependencies.length === 0)
        .map(t => t.earliestStartDate ? new Date(t.earliestStartDate).getTime() : 0));

      // Project duration in days
      totalEstimatedDays = Math.ceil((maxFinishTime - projectStartTime) / (24 * 60 * 60 * 1000));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="container mx-auto px-6 py-12 max-w-7xl">

        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light text-gray-800 mb-4 tracking-tight">
            Task Manager
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
            Stay organized, track dependencies, and manage your critical path with style
          </p>
        </div>

        {/* Critical Path Summary with loading indicator */}
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
                    <h3 className="text-xl font-semibold">
                      Critical Path Analysis
                      {isRecalculating && (
                        <span className="ml-3 text-sm font-normal opacity-90">
                          (Recalculating...)
                        </span>
                      )}
                    </h3>
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
                    disabled={isRecalculating}
                    className="px-6 py-3 bg-white text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRecalculating ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Recalculating...
                      </span>
                    ) : (
                      'Recalculate'
                    )}
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
              existingTodos={todos}
            />
          </div>
        </div>

        {/* Todo List Section */}
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
                  {isRecalculating && ' • Updating critical path...'}
                </div>
              </div>

              {/* Todo grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                {todos.map((todo) => (
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

        {/* Stats Section */}
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
                  <h4 className="font-semibold text-gray-900 text-lg">Min Duration</h4>
                  <p className="text-3xl font-light text-purple-600 mt-1">
                    {totalEstimatedDays || 0} days
                  </p>
                  <p className="text-xs text-gray-500 mt-1">critical path</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}