// app/page.tsx
"use client"
import { useState, useEffect, useCallback } from 'react';
import ToDoItem from '@/components/ToDoItem';
import AddToDoForm from '@/components/AddToDoForm';
import EmptyState from '@/components/EmptyState';
import DependencyGraph from '@/components/DependencyGraph';
import ReadyToStartCard from '@/components/ReadyToStartCard';
import CompactStats from '@/components/CompactStats';
import EditToDoModal from '@/components/EditToDoModal';
import { TodoWithRelations } from '@/lib/types';

export default function Home() {
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedTodoForEdit, setSelectedTodoForEdit] = useState<TodoWithRelations | null>(null);

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
        if (data.todos) {
          setTodos(data.todos);
        } else {
          await fetchTodos();
        }
      } else {
        throw new Error('Failed to add todo');
      }
    } catch (error) {
      console.error('Failed to add todo:', error);
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
      await fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleToggleComplete = async (id: number) => {
    setIsRecalculating(true);
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });
      // The backend recalculates critical path on completion change
      await fetchTodos();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

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

  // Calculate ready to start tasks (tasks with no incomplete dependencies)
  const getReadyToStartTasks = () => {
    return todos.filter(todo => {
      if (todo.completed) return false;

      // Check if all dependencies are completed
      if (!todo.dependencies || todo.dependencies.length === 0) {
        return true; // No dependencies means ready to start
      }

      // Check if all dependencies are completed
      return todo.dependencies.every(dep => {
        const dependencyTodo = todos.find(t => t.id === dep.dependsOnId);
        return dependencyTodo?.completed === true;
      });
    })
      .sort((a, b) => {
        // Sort by critical path first, then by duration
        if (a.isOnCriticalPath && !b.isOnCriticalPath) return -1;
        if (!a.isOnCriticalPath && b.isOnCriticalPath) return 1;
        return (b.estimatedDays || 1) - (a.estimatedDays || 1);
      })
      .slice(0, 5); // Maximum 5 tasks
  };

  // Derive critical path info from todos  
  const criticalPath = todos.filter(todo => todo.isOnCriticalPath).map(t => t.id);
  const criticalPathTasks = todos.filter(todo => todo.isOnCriticalPath);
  const readyToStartTasks = getReadyToStartTasks();

  // Calculate project duration
  let totalEstimatedDays = 0;
  if (todos.length > 0) {
    const taskFinishTimes = todos.map(task => {
      if (task.earliestStartDate) {
        const startMs = new Date(task.earliestStartDate).getTime();
        const durationMs = (task.estimatedDays || 1) * 24 * 60 * 60 * 1000;
        return startMs + durationMs;
      } else {
        return (task.estimatedDays || 1) * 24 * 60 * 60 * 1000;
      }
    });

    if (taskFinishTimes.length > 0) {
      const maxFinishTime = Math.max(...taskFinishTimes);
      const projectStartTime = Math.min(...todos
        .filter(t => !t.dependencies || t.dependencies.length === 0)
        .map(t => t.earliestStartDate ? new Date(t.earliestStartDate).getTime() : 0));

      totalEstimatedDays = Math.ceil((maxFinishTime - projectStartTime) / (24 * 60 * 60 * 1000));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-light text-gray-800 mb-4 tracking-tight">
          Task Manager
        </h1>
        <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
          Stay organized, track dependencies, and manage your critical path with style
        </p>
      </div>

      {/* Main Content Area with 70/30 Split */}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex gap-8">
          {/* Left Column - 70% */}
          <div className="flex-1">
            {/* Critical Path Summary */}
            {criticalPathTasks.length > 0 && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
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
                        {isRecalculating ? 'Recalculating...' : 'Recalculate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dependency Graph */}
            {showGraph && (
              <div className="mb-8">
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

            {/* Add Todo Form */}
            <div className="mb-8">
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

            {/* Todo List */}
            <div className="mb-8">
              {todos.length === 0 ? (
                <div className="flex justify-center">
                  <EmptyState />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Your Tasks</h2>
                    <div className="text-sm text-gray-500">
                      {todos.length} total • {todos.filter(t => t.completed).length} completed
                      {isRecalculating && ' • Updating critical path...'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {todos.map((todo) => (
                      <ToDoItem
                        key={todo.id}
                        todo={todo}
                        allTodos={todos}
                        onDelete={handleDeleteTodo}
                        onImageUpdate={handleImageUpdate}
                        onUpdate={handleUpdate}
                        onToggleComplete={handleToggleComplete}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Sidebar - 30% */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              {/* Ready to Start Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ready to Start
                </h3>

                {readyToStartTasks.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-gray-500 text-sm">No tasks ready to start</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readyToStartTasks.map(todo => (
                      <ReadyToStartCard
                        key={todo.id}
                        todo={todo}
                        onToggleComplete={handleToggleComplete}
                        onClick={() => setSelectedTodoForEdit(todo)}
                      />
                    ))}

                    {todos.filter(t => !t.completed && (
                      !t.dependencies ||
                      t.dependencies.length === 0 ||
                      t.dependencies.every(dep => {
                        const depTodo = todos.find(td => td.id === dep.dependsOnId);
                        return depTodo?.completed === true;
                      })
                    )).length > 5 && (
                        <p className="text-sm text-gray-500 text-center mt-3">
                          +{todos.filter(t => !t.completed && (
                            !t.dependencies ||
                            t.dependencies.length === 0 ||
                            t.dependencies.every(dep => {
                              const depTodo = todos.find(td => td.id === dep.dependsOnId);
                              return depTodo?.completed === true;
                            })
                          )).length - 5} more ready tasks
                        </p>
                      )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6"></div>

              {/* Stats Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistics
                </h3>
                <CompactStats
                  totalTasks={todos.length}
                  completedTasks={todos.filter(t => t.completed).length}
                  criticalTasks={criticalPathTasks.length}
                  projectDuration={totalEstimatedDays}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedTodoForEdit && (
        <EditToDoModal
          todo={selectedTodoForEdit}
          allTodos={todos}
          isOpen={!!selectedTodoForEdit}
          onClose={() => setSelectedTodoForEdit(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}