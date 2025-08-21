// lib/dependency-graph.ts

export interface TodoWithDependencies {
    id: number;
    title: string;
    completed: boolean;
    dueDate?: Date | null;
    estimatedDays: number;
    dependencies: { dependsOnId: number }[];
    dependents: { todoId: number }[];
    earliestStartDate?: Date | null;
    criticalPathLength: number;
    isOnCriticalPath: boolean;
}

export interface DependencyGraphResult {
    isValid: boolean;
    circularDependency?: {
        cycle: number[];
        message: string;
    };
    criticalPath?: number[];
    scheduleData?: {
        [todoId: number]: {
            earliestStart: Date;
            earliestFinish: Date;
            latestStart: Date;
            latestFinish: Date;
            slack: number;
            isOnCriticalPath: boolean;
        };
    };
}

export class DependencyGraphService {
    /**
     * Validates a proposed dependency addition for circular references
     * Time Complexity: O(V + E) where V = vertices (tasks), E = edges (dependencies)
     */
    static validateDependency(
        todos: TodoWithDependencies[],
        fromTodoId: number,
        toTodoId: number
    ): { isValid: boolean; cycle?: number[] } {
        // Don't allow self-dependencies
        if (fromTodoId === toTodoId) {
            return { isValid: false, cycle: [fromTodoId] };
        }

        // Create adjacency list including the proposed new dependency
        const adjacencyList = this.buildAdjacencyList(todos);

        // Add the proposed dependency
        if (!adjacencyList[fromTodoId]) adjacencyList[fromTodoId] = [];
        adjacencyList[fromTodoId].push(toTodoId);

        // Check for cycles using DFS
        const visited = new Set<number>();
        const recursionStack = new Set<number>();
        const path: number[] = [];

        for (const todoId of Object.keys(adjacencyList).map(Number)) {
            if (!visited.has(todoId)) {
                const cycle = this.detectCycleDFS(
                    todoId,
                    adjacencyList,
                    visited,
                    recursionStack,
                    path
                );
                if (cycle) {
                    return { isValid: false, cycle };
                }
            }
        }

        return { isValid: true };
    }

    /**
     * Calculates critical path using the Critical Path Method (CPM)
     * Time Complexity: O(V + E) for topological sort + O(V) for forward/backward passes
     * Space Complexity: O(V) for storing schedule data
     */
    static calculateCriticalPath(
        todos: TodoWithDependencies[]
    ): DependencyGraphResult {
        if (todos.length === 0) {
            return {
                isValid: true,
                criticalPath: [],
                scheduleData: {}
            };
        }

        // First validate no cycles exist
        const adjacencyList = this.buildAdjacencyList(todos);
        const cycleCheck = this.detectCycles(adjacencyList);

        if (!cycleCheck.isValid) {
            return cycleCheck;
        }

        // Topological sort for dependency ordering
        const topologicalOrder = this.topologicalSort(todos);

        if (!topologicalOrder) {
            return { isValid: false };
        }

        // Calculate forward pass (earliest times)
        const scheduleData = this.calculateForwardPass(todos, topologicalOrder);

        // Calculate backward pass (latest times and slack)
        this.calculateBackwardPass(todos, scheduleData, topologicalOrder);

        // Identify critical path
        const criticalPath = this.identifyCriticalPath(scheduleData);

        return {
            isValid: true,
            criticalPath,
            scheduleData
        };
    }

    /**
     * Build adjacency list representation of dependency graph
     */
    private static buildAdjacencyList(
        todos: TodoWithDependencies[]
    ): { [todoId: number]: number[] } {
        const adjacencyList: { [todoId: number]: number[] } = {};

        // Initialize empty arrays for all todos
        todos.forEach(todo => {
            adjacencyList[todo.id] = [];
        });

        // Add dependencies
        todos.forEach(todo => {
            todo.dependencies.forEach(dep => {
                adjacencyList[todo.id].push(dep.dependsOnId);
            });
        });

        return adjacencyList;
    }

    /**
     * Detect cycles using Depth-First Search (DFS)
     * Uses recursion stack to track current path and detect back edges
     */
    private static detectCycleDFS(
        node: number,
        adjacencyList: { [todoId: number]: number[] },
        visited: Set<number>,
        recursionStack: Set<number>,
        path: number[]
    ): number[] | null {
        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const neighbors = adjacencyList[node] || [];

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                const cycle = this.detectCycleDFS(
                    neighbor,
                    adjacencyList,
                    visited,
                    recursionStack,
                    [...path] // Create new path array for each recursive call
                );
                if (cycle) return cycle;
            } else if (recursionStack.has(neighbor)) {
                // Found cycle - extract the cycle portion
                const cycleStart = path.indexOf(neighbor);
                return path.slice(cycleStart).concat([neighbor]);
            }
        }

        recursionStack.delete(node);
        path.pop();
        return null;
    }

    /**
     * Detect all cycles in the graph
     */
    private static detectCycles(
        adjacencyList: { [todoId: number]: number[] }
    ): DependencyGraphResult {
        const visited = new Set<number>();
        const recursionStack = new Set<number>();

        for (const nodeId of Object.keys(adjacencyList).map(Number)) {
            if (!visited.has(nodeId)) {
                const cycle = this.detectCycleDFS(
                    nodeId,
                    adjacencyList,
                    visited,
                    recursionStack,
                    []
                );
                if (cycle) {
                    return {
                        isValid: false,
                        circularDependency: {
                            cycle,
                            message: `Circular dependency detected: ${cycle.join(' → ')}`
                        }
                    };
                }
            }
        }

        return { isValid: true };
    }

    /**
     * Topological sort using Kahn's algorithm
     * Processes nodes in dependency order (dependencies before dependents)
     */
    private static topologicalSort(todos: TodoWithDependencies[]): number[] | null {
        const inDegree: { [todoId: number]: number } = {};

        // Initialize in-degrees
        todos.forEach(todo => {
            inDegree[todo.id] = 0;
        });

        // Calculate in-degrees (how many dependencies each task has)
        todos.forEach(todo => {
            todo.dependencies.forEach(dep => {
                inDegree[todo.id]++;
            });
        });

        // Queue nodes with no dependencies
        const queue: number[] = [];
        Object.entries(inDegree).forEach(([todoId, degree]) => {
            if (degree === 0) {
                queue.push(parseInt(todoId));
            }
        });

        const result: number[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            result.push(current);

            // Find todos that depend on current todo and reduce their in-degree
            todos.forEach(todo => {
                if (todo.dependencies.some(dep => dep.dependsOnId === current)) {
                    inDegree[todo.id]--;
                    if (inDegree[todo.id] === 0) {
                        queue.push(todo.id);
                    }
                }
            });
        }

        // If result doesn't include all nodes, there's a cycle
        return result.length === todos.length ? result : null;
    }

    /**
     * Calculate earliest start and finish times (forward pass)
     * Propagates earliest possible times through the dependency network
     */
    private static calculateForwardPass(
        todos: TodoWithDependencies[],
        topologicalOrder: number[]
    ) {
        const scheduleData: { [todoId: number]: any } = {};
        const todoMap = new Map(todos.map(t => [t.id, t]));
        const baseTime = new Date();

        // Initialize all schedule data
        todos.forEach(todo => {
            scheduleData[todo.id] = {
                earliestStart: new Date(baseTime),
                earliestFinish: new Date(baseTime),
                latestStart: new Date(baseTime),
                latestFinish: new Date(baseTime),
                slack: 0,
                isOnCriticalPath: false
            };
        });

        // Process in topological order (dependencies first)
        topologicalOrder.forEach(todoId => {
            const todo = todoMap.get(todoId)!;
            let maxPredecessorFinish = new Date(baseTime);

            // Find latest finish time of all dependencies
            todo.dependencies.forEach(dep => {
                const depFinish = scheduleData[dep.dependsOnId].earliestFinish;
                if (depFinish.getTime() > maxPredecessorFinish.getTime()) {
                    maxPredecessorFinish = new Date(depFinish);
                }
            });

            // Set earliest times
            scheduleData[todoId].earliestStart = new Date(maxPredecessorFinish);
            const durationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;
            scheduleData[todoId].earliestFinish = new Date(
                maxPredecessorFinish.getTime() + durationMs
            );
        });

        return scheduleData;
    }

    /**
     * Calculate latest start and finish times (backward pass) using standard CPM
     * Fixed to properly handle independent tasks that match critical path duration
     */
    private static calculateBackwardPass(
        todos: TodoWithDependencies[],
        scheduleData: { [todoId: number]: any },
        topologicalOrder: number[]
    ) {
        const todoMap = new Map(todos.map(t => [t.id, t]));

        // Find project end time (latest earliest finish of all tasks)
        const projectEndTime = Math.max(
            ...Object.values(scheduleData).map((data: any) => data.earliestFinish.getTime())
        );

        // Separate tasks into dependent and independent
        const independentTasks = todos.filter(t => t.dependencies.length === 0 &&
            !todos.some(other => other.dependencies.some(dep => dep.dependsOnId === t.id)));
        const dependentTasks = todos.filter(t => !independentTasks.includes(t));

        // First, calculate backward pass for tasks with dependencies
        const reverseOrder = [...topologicalOrder].reverse();

        reverseOrder.forEach(todoId => {
            const todo = todoMap.get(todoId)!;

            // Skip independent tasks for now
            if (independentTasks.some(t => t.id === todoId)) {
                return;
            }

            // Find all tasks that depend on this task (successors)
            const successorTasks = todos.filter(t =>
                t.dependencies.some(dep => dep.dependsOnId === todoId)
            );

            if (successorTasks.length === 0) {
                // End task - no successors, set latest finish to project end
                scheduleData[todoId].latestFinish = new Date(projectEndTime);
            } else {
                // Find the earliest latest start time among all successors
                let earliestSuccessorLatestStart = new Date(projectEndTime);

                successorTasks.forEach(successor => {
                    const successorLatestStart = scheduleData[successor.id].latestStart;
                    if (successorLatestStart.getTime() < earliestSuccessorLatestStart.getTime()) {
                        earliestSuccessorLatestStart = new Date(successorLatestStart);
                    }
                });

                // This task's latest finish must be no later than its earliest successor's latest start
                scheduleData[todoId].latestFinish = new Date(earliestSuccessorLatestStart);
            }

            // Calculate latest start based on latest finish and duration
            const durationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;
            scheduleData[todoId].latestStart = new Date(
                scheduleData[todoId].latestFinish.getTime() - durationMs
            );

            // Calculate total float (slack)
            scheduleData[todoId].slack =
                scheduleData[todoId].latestStart.getTime() - scheduleData[todoId].earliestStart.getTime();

            // Task is on critical path if it has zero slack (within small tolerance for floating point)
            scheduleData[todoId].isOnCriticalPath = Math.abs(scheduleData[todoId].slack) < 1000; // 1 second tolerance
        });

        // Now handle independent tasks
        if (independentTasks.length > 0) {
            // Find the critical path duration from dependent tasks
            let criticalPathDuration = 0;

            if (dependentTasks.length > 0) {
                // Get the maximum duration from tasks already marked as critical
                const criticalDependentTasks = dependentTasks.filter(t => scheduleData[t.id].isOnCriticalPath);
                if (criticalDependentTasks.length > 0) {
                    criticalPathDuration = Math.max(
                        ...criticalDependentTasks.map(t =>
                            scheduleData[t.id].earliestFinish.getTime() - scheduleData[t.id].earliestStart.getTime()
                        )
                    );
                    // Actually, we want the project end time from the dependent critical path
                    criticalPathDuration = projectEndTime;
                }
            }

            // For independent tasks, mark as critical if their duration >= the critical path duration
            independentTasks.forEach(todo => {
                const taskDurationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;
                const taskEndTime = scheduleData[todo.id].earliestFinish.getTime();

                // Task is critical if it ends at or after the project end time
                // This handles the case where an independent task has the same duration as the critical path
                const isCritical = taskEndTime >= projectEndTime - 1000; // 1 second tolerance

                scheduleData[todo.id].isOnCriticalPath = isCritical;
                scheduleData[todo.id].latestFinish = new Date(projectEndTime);
                scheduleData[todo.id].latestStart = new Date(projectEndTime - taskDurationMs);

                if (isCritical) {
                    scheduleData[todo.id].slack = 0;
                } else {
                    scheduleData[todo.id].slack = projectEndTime - taskEndTime;
                }
            });
        }

        // Special case: ALL tasks are independent (no dependencies at all)
        const hasAnyDependencies = todos.some(t => t.dependencies.length > 0);

        if (!hasAnyDependencies && todos.length > 0) {
            // All tasks are independent - only the longest duration tasks are critical
            const maxDuration = Math.max(...todos.map(t => t.estimatedDays));

            todos.forEach(todo => {
                const isCritical = todo.estimatedDays === maxDuration;
                scheduleData[todo.id].isOnCriticalPath = isCritical;

                if (!isCritical) {
                    const maxDurationMs = maxDuration * 24 * 60 * 60 * 1000;
                    const taskDurationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;

                    scheduleData[todo.id].slack = maxDurationMs - taskDurationMs;
                    scheduleData[todo.id].latestFinish = new Date(
                        scheduleData[todo.id].earliestFinish.getTime() + scheduleData[todo.id].slack
                    );
                    scheduleData[todo.id].latestStart = new Date(
                        scheduleData[todo.id].earliestStart.getTime() + scheduleData[todo.id].slack
                    );
                }
            });
        }
    }

    /**
     * Identify the critical path (all tasks with zero slack, ordered by start time)
     * Returns array of task IDs representing the critical path sequence
     */
    private static identifyCriticalPath(
        scheduleData: { [todoId: number]: any }
    ): number[] {
        return Object.entries(scheduleData)
            .filter(([_, data]) => data.isOnCriticalPath)
            .map(([todoId, _]) => parseInt(todoId))
            .sort((a, b) => {
                // Sort by earliest start time to show proper sequence
                return scheduleData[a].earliestStart.getTime() - scheduleData[b].earliestStart.getTime();
            });
    }
}