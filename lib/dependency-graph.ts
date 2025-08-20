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
     * Calculates critical path and earliest start dates
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
     * Detect cycles using Depth-First Search
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
     */
    private static topologicalSort(todos: TodoWithDependencies[]): number[] | null {
        const inDegree: { [todoId: number]: number } = {};
        const adjacencyList = this.buildAdjacencyList(todos);

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
     */
    private static calculateForwardPass(
        todos: TodoWithDependencies[],
        topologicalOrder: number[]
    ) {
        const scheduleData: { [todoId: number]: any } = {};
        const todoMap = new Map(todos.map(t => [t.id, t]));
        const baseTime = new Date();

        // Initialize all start times
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
            const durationMs = todo.estimatedDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
            scheduleData[todoId].earliestFinish = new Date(
                maxPredecessorFinish.getTime() + durationMs
            );
        });

        return scheduleData;
    }

    /**
     * Calculate latest start and finish times (backward pass)
     */
    private static calculateBackwardPass(
        todos: TodoWithDependencies[],
        scheduleData: { [todoId: number]: any },
        topologicalOrder: number[]
    ) {
        const todoMap = new Map(todos.map(t => [t.id, t]));

        // Find project end time (latest finish of all tasks)
        const projectEndTime = Math.max(
            ...Object.values(scheduleData).map((data: any) => data.earliestFinish.getTime())
        );

        // Process in reverse topological order
        const reverseOrder = [...topologicalOrder].reverse();

        reverseOrder.forEach(todoId => {
            const todo = todoMap.get(todoId)!;

            // Find tasks that depend on this task
            const dependentTasks = todos.filter(t =>
                t.dependencies.some(dep => dep.dependsOnId === todoId)
            );

            if (dependentTasks.length === 0) {
                // If this is an end task (no dependents), set latest finish to project end
                scheduleData[todoId].latestFinish = new Date(projectEndTime);
            } else {
                // Find earliest latest start of all dependents
                let minSuccessorStart = new Date(projectEndTime);
                dependentTasks.forEach(dependent => {
                    const depStart = scheduleData[dependent.id].latestStart;
                    if (depStart < minSuccessorStart) {
                        minSuccessorStart = new Date(depStart);
                    }
                });
                scheduleData[todoId].latestFinish = new Date(minSuccessorStart);
            }

            // Calculate latest start
            const durationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;
            scheduleData[todoId].latestStart = new Date(
                scheduleData[todoId].latestFinish.getTime() - durationMs
            );

            // Calculate slack
            scheduleData[todoId].slack =
                scheduleData[todoId].latestStart.getTime() - scheduleData[todoId].earliestStart.getTime();

            // Critical path tasks have zero slack
            scheduleData[todoId].isOnCriticalPath = scheduleData[todoId].slack === 0;
        });

        // Handle mixed scenarios: tasks with and without dependencies
        const hasAnyDependencies = todos.some(t => t.dependencies.length > 0);

        if (hasAnyDependencies) {
            // Mixed case: handle independent tasks separately
            const independentTasks = todos.filter(t => t.dependencies.length === 0);
            const dependentTasks = todos.filter(t => t.dependencies.length > 0);

            if (independentTasks.length > 0) {
                // Find the critical path length from dependent tasks
                const criticalPathLengthMs = dependentTasks.length > 0
                    ? Math.max(...dependentTasks.map(t => scheduleData[t.id].earliestFinish.getTime()))
                    : 0;

                const criticalPathLengthDays = criticalPathLengthMs / (24 * 60 * 60 * 1000);

                independentTasks.forEach(todo => {
                    // Independent tasks are critical only if they're as long as the critical path
                    const shouldBeCritical = todo.estimatedDays >= criticalPathLengthDays;
                    scheduleData[todo.id].isOnCriticalPath = shouldBeCritical;

                    if (!shouldBeCritical) {
                        // Calculate slack: how much time they have within the project duration
                        const projectDurationMs = Math.max(criticalPathLengthMs, projectEndTime);
                        const taskDurationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;
                        scheduleData[todo.id].slack = projectDurationMs - taskDurationMs;

                        // Update latest times for non-critical independent tasks
                        scheduleData[todo.id].latestFinish = new Date(projectDurationMs);
                        scheduleData[todo.id].latestStart = new Date(projectDurationMs - taskDurationMs);
                    }
                });
            }
        } else {
            // All tasks are independent - only longest tasks are critical
            const maxDuration = Math.max(...todos.map(t => t.estimatedDays));

            todos.forEach(todo => {
                scheduleData[todo.id].isOnCriticalPath = todo.estimatedDays === maxDuration;

                if (todo.estimatedDays < maxDuration) {
                    const taskDurationMs = todo.estimatedDays * 24 * 60 * 60 * 1000;
                    const maxDurationMs = maxDuration * 24 * 60 * 60 * 1000;
                    scheduleData[todo.id].slack = maxDurationMs - taskDurationMs;

                    // Update latest times
                    scheduleData[todo.id].latestFinish = new Date(maxDurationMs);
                    scheduleData[todo.id].latestStart = new Date(maxDurationMs - taskDurationMs);
                }
            });
        }
    }

    /**
     * Identify the critical path (longest path through the network)
     */
    private static identifyCriticalPath(
        scheduleData: { [todoId: number]: any }
    ): number[] {
        return Object.entries(scheduleData)
            .filter(([_, data]) => data.isOnCriticalPath)
            .map(([todoId, _]) => parseInt(todoId))
            .sort((a, b) => {
                // Sort by earliest start time
                return scheduleData[a].earliestStart.getTime() - scheduleData[b].earliestStart.getTime();
            });
    }
}