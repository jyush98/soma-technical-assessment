// components/DependencyGraph.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Connection,
    ConnectionMode,
    MarkerType,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TodoWithRelations } from '@/lib/types';

interface DependencyGraphProps {
    todos: TodoWithRelations[];
    criticalPath: number[];
    onUpdate: () => void;
    onAddDependency?: (todoId: number, dependsOnId: number) => Promise<void>;
    onRemoveDependency?: (todoId: number, dependsOnId: number) => Promise<void>;
}

// Hierarchical layout algorithm
function getHierarchicalLayout(todos: TodoWithRelations[], criticalPath: number[]): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create a map of todo ID to its level in the hierarchy
    const levels = new Map<number, number>();
    const todoMap = new Map(todos.map(t => [t.id, t]));

    // Calculate levels using topological sort approach
    const calculateLevel = (todoId: number, visited = new Set<number>()): number => {
        if (levels.has(todoId)) return levels.get(todoId)!;
        if (visited.has(todoId)) return 0; // Cycle detection

        visited.add(todoId);
        const todo = todoMap.get(todoId);
        if (!todo) return 0;

        let maxDependencyLevel = -1;
        if (todo.dependencies && todo.dependencies.length > 0) {
            for (const dep of todo.dependencies) {
                const depLevel = calculateLevel(dep.dependsOnId, visited);
                maxDependencyLevel = Math.max(maxDependencyLevel, depLevel);
            }
        }

        const level = maxDependencyLevel + 1;
        levels.set(todoId, level);
        return level;
    };

    // Calculate levels for all todos
    todos.forEach(todo => calculateLevel(todo.id));

    // Group todos by level
    const todosByLevel = new Map<number, TodoWithRelations[]>();
    todos.forEach(todo => {
        const level = levels.get(todo.id) || 0;
        if (!todosByLevel.has(level)) {
            todosByLevel.set(level, []);
        }
        todosByLevel.get(level)!.push(todo);
    });

    // Position nodes
    const levelWidth = 250;
    const nodeHeight = 100;
    const nodeSpacing = 120;

    todosByLevel.forEach((todosAtLevel, level) => {
        todosAtLevel.forEach((todo, index) => {
            const isOnCriticalPath = criticalPath.includes(todo.id);

            // Calculate y position to center nodes at each level
            const totalHeight = todosAtLevel.length * nodeSpacing;
            const startY = -totalHeight / 2;
            const y = startY + index * nodeSpacing;

            nodes.push({
                id: todo.id.toString(),
                position: {
                    x: level * levelWidth,
                    y: y
                },
                data: {
                    label: (
                        <div className="text-center">
                            <div className="font-semibold">{todo.title}</div>
                            <div className="text-xs mt-1">
                                {todo.estimatedDays} day{todo.estimatedDays !== 1 ? 's' : ''}
                            </div>
                            {todo.completed && (
                                <div className="text-xs text-green-600 mt-1">✓ Completed</div>
                            )}
                        </div>
                    )
                },
                style: {
                    background: todo.completed ? '#e6ffed' : isOnCriticalPath ? '#fee2e2' : '#f3f4f6',
                    border: todo.completed ? '2px solid #16a34a' : isOnCriticalPath ? '2px solid #dc2626' : '1px solid #9ca3af',
                    borderRadius: '8px',
                    padding: '10px',
                    width: 180,
                    fontSize: '14px',
                },
                sourcePosition: 'right' as any,
                targetPosition: 'left' as any,
            });
        });
    });

    // Create edges
    todos.forEach(todo => {
        if (todo.dependencies) {
            todo.dependencies.forEach(dep => {
                const isOnCriticalPath =
                    criticalPath.includes(todo.id) &&
                    criticalPath.includes(dep.dependsOnId);

                edges.push({
                    id: `${dep.dependsOnId}-${todo.id}`,
                    source: dep.dependsOnId.toString(),
                    target: todo.id.toString(),
                    type: 'smoothstep',
                    animated: isOnCriticalPath,
                    style: {
                        stroke: isOnCriticalPath ? '#dc2626' : '#9ca3af',
                        strokeWidth: isOnCriticalPath ? 4 : 3,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: isOnCriticalPath ? '#dc2626' : '#9ca3af',
                    },
                });
            });
        }
    });

    return { nodes, edges };
}

export default function DependencyGraph({
    todos,
    criticalPath,
    onUpdate,
    onAddDependency,
    onRemoveDependency
}: DependencyGraphProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const { nodes: layoutNodes, edges: layoutEdges } = getHierarchicalLayout(todos, criticalPath);
        setNodes(layoutNodes);
        setEdges(layoutEdges);
    }, [todos, criticalPath, setNodes, setEdges]);

    // Handle new connections (adding dependencies)
    const onConnect = useCallback(async (params: Connection) => {
        if (!onAddDependency || !params.source || !params.target) return;

        const sourceId = parseInt(params.source);
        const targetId = parseInt(params.target);

        // Prevent self-connections
        if (sourceId === targetId) {
            alert('A task cannot depend on itself');
            return;
        }

        setIsUpdating(true);
        try {
            // Target depends on Source in our model
            await onAddDependency(targetId, sourceId);
            onUpdate(); // Refresh the data
        } catch (error: any) {
            alert(error.message || 'Failed to add dependency');
        } finally {
            setIsUpdating(false);
        }
    }, [onAddDependency, onUpdate]);

    // Handle edge deletion (removing dependencies)
    const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
        if (!onRemoveDependency || deletedEdges.length === 0) return;

        setIsUpdating(true);
        try {
            for (const edge of deletedEdges) {
                const sourceId = parseInt(edge.source);
                const targetId = parseInt(edge.target);
                await onRemoveDependency(targetId, sourceId);
            }
            onUpdate(); // Refresh the data
        } catch (error: any) {
            alert(error.message || 'Failed to remove dependency');
        } finally {
            setIsUpdating(false);
        }
    }, [onRemoveDependency, onUpdate]);

    return (
        <div className="flex flex-col gap-4">
            <div style={{ width: '100%', height: '500px' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onEdgesDelete={onEdgesDelete}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    nodesDraggable={true}
                    nodesConnectable={!!onAddDependency}
                    deleteKeyCode={['Delete', 'Backspace']}
                    elementsSelectable={true}
                    minZoom={0.5}
                    maxZoom={1.5}
                >
                    <Controls />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    {isUpdating && (
                        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded">
                            Updating...
                        </div>
                    )}
                </ReactFlow>
            </div>
            {onAddDependency && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                    • Drag from one node to another to create a dependency<br />
                    • Click on an edge and press Delete to remove a dependency<br />
                    • Red edges indicate the critical path
                </div>
            )}
        </div>
    );
}