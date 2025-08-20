// components/DependencyGraph.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Node,
    Edge,
    addEdge,
    Connection,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    ReactFlowProvider,
    Position,
    BackgroundVariant,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface Todo {
    id: number;
    title: string;
    completed: boolean;
    isOnCriticalPath?: boolean;
    estimatedDays?: number | null;
}

interface TodoDependency {
    id: number;
    todoId: number;
    dependsOnId: number;
}

interface DependencyGraphProps {
    todos: Todo[];
    criticalPath: number[];
    onUpdate: () => void;
}

function DependencyGraph({ todos, criticalPath, onUpdate }: DependencyGraphProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [dependencies, setDependencies] = useState<TodoDependency[]>([]);

    // Fetch all dependencies
    useEffect(() => {
        const fetchAllDependencies = async () => {
            try {
                const dependencyPromises = todos.map(todo =>
                    fetch(`/api/todos/${todo.id}/dependencies`).then(res => res.json())
                );
                const dependencyResults = await Promise.all(dependencyPromises);

                const allDependencies = dependencyResults.flat();
                setDependencies(allDependencies);
            } catch (error) {
                console.error('Error fetching dependencies:', error);
            }
        };

        if (todos.length > 0) {
            fetchAllDependencies();
        }
    }, [todos]);

    // Convert todos to React Flow nodes
    const createNodes = useCallback((): Node[] => {
        return todos.map((todo, index) => {
            const isOnCriticalPath = criticalPath.includes(todo.id);
            const col = index % 4;
            const row = Math.floor(index / 4);

            return {
                id: todo.id.toString(),
                type: 'default',
                position: {
                    x: col * 250,
                    y: row * 120
                },
                data: {
                    label: (
                        <div className={`p-3 rounded-lg shadow-sm border-2 min-w-[200px] ${isOnCriticalPath
                                ? 'bg-red-100 border-red-400 text-red-800'
                                : todo.completed
                                    ? 'bg-green-100 border-green-400 text-green-800'
                                    : 'bg-blue-100 border-blue-400 text-blue-800'
                            }`}>
                            <div className="font-medium text-sm mb-1 truncate" title={todo.title}>
                                {todo.title}
                            </div>
                            <div className="text-xs opacity-75">
                                {todo.estimatedDays} day{todo.estimatedDays !== 1 ? 's' : ''}
                            </div>
                            {isOnCriticalPath && (
                                <div className="text-xs font-bold mt-1">CRITICAL</div>
                            )}
                            {todo.completed && (
                                <div className="text-xs font-bold mt-1">DONE</div>
                            )}
                        </div>
                    )
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
                style: {
                    background: 'transparent',
                    border: 'none',
                    padding: 0
                }
            };
        });
    }, [todos, criticalPath]);

    // Convert dependencies to React Flow edges
    const createEdges = useCallback((): Edge[] => {
        return dependencies.map(dep => {
            const isOnCriticalPath =
                criticalPath.includes(dep.todoId) && criticalPath.includes(dep.dependsOnId);

            return {
                id: `${dep.dependsOnId}-${dep.todoId}`,
                source: dep.dependsOnId.toString(),
                target: dep.todoId.toString(),
                type: 'smoothstep',
                animated: isOnCriticalPath,
                style: {
                    stroke: isOnCriticalPath ? '#dc2626' : '#6b7280',
                    strokeWidth: isOnCriticalPath ? 3 : 2,
                },
                markerEnd: {
                    type: MarkerType.Arrow,
                    color: isOnCriticalPath ? '#dc2626' : '#6b7280',
                },
            };
        });
    }, [dependencies, criticalPath]);

    // Update nodes and edges when dependencies change
    useEffect(() => {
        setNodes(createNodes());
        setEdges(createEdges());
    }, [createNodes, createEdges]);

    // Handle new connections (adding dependencies)
    const onConnect = useCallback(
        async (params: Connection) => {
            if (params.source && params.target) {
                try {
                    const res = await fetch(`/api/todos/${params.target}/dependencies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dependsOnId: parseInt(params.source) })
                    });

                    if (!res.ok) {
                        const errorData = await res.json();
                        alert(errorData.message || 'Failed to add dependency');
                        return;
                    }

                    onUpdate();
                } catch (error) {
                    console.error('Error adding dependency:', error);
                    alert('Failed to add dependency');
                }
            }
        },
        [onUpdate]
    );

    // Handle edge deletion (removing dependencies)
    const onEdgeClick = useCallback(
        async (event: React.MouseEvent, edge: Edge) => {
            event.stopPropagation();

            if (confirm('Remove this dependency?')) {
                try {
                    const res = await fetch(
                        `/api/todos/${edge.target}/dependencies?dependsOnId=${edge.source}`,
                        { method: 'DELETE' }
                    );

                    if (!res.ok) {
                        throw new Error('Failed to remove dependency');
                    }

                    onUpdate();
                } catch (error) {
                    console.error('Error removing dependency:', error);
                    alert('Failed to remove dependency');
                }
            }
        },
        [onUpdate]
    );

    if (todos.length === 0) {
        return (
            <div className="w-full h-96 border rounded-lg bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">No tasks to display</p>
            </div>
        );
    }

    return (
        <div className="w-full h-96 border rounded-lg bg-white">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                fitView
                attributionPosition="bottom-left"
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
            >
                <Controls />
                <MiniMap
                    className="!bg-gray-100"
                    nodeColor={(node) => {
                        const isOnCriticalPath = criticalPath.includes(parseInt(node.id));
                        return isOnCriticalPath ? '#dc2626' : '#3b82f6';
                    }}
                />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>

            {/* Instructions */}
            <div className="p-3 bg-gray-50 border-t text-sm text-gray-600">
                <p>
                    <strong>Instructions:</strong> Drag to connect tasks (dependency flows left to right).
                    Click edges to remove dependencies. Red paths show the critical path.
                </p>
            </div>
        </div>
    );
}

// Wrapper component with ReactFlowProvider
export default function DependencyGraphWithProvider(props: DependencyGraphProps) {
    return (
        <ReactFlowProvider>
            <DependencyGraph {...props} />
        </ReactFlowProvider>
    );
}