// lib/__tests__/dependency-graph.test.ts

describe('DependencyGraphService', () => {
    beforeEach(() => {
        // Reset modules before each test for clean state
        jest.resetModules();
    });

    // Mock todo interface for testing
    const createMockTodo = (
        id: number,
        text: string,
        dependencies: number[] = [],
        estimatedHours: number = 1,
        completed: boolean = false
    ) => ({
        id,
        text,
        completed,
        estimatedHours,
        dependencies: dependencies.map(depId => ({ dependsOnId: depId })),
        dependents: [], // Will be calculated based on dependencies
        earliestStartDate: null,
        criticalPathLength: 0,
        isOnCriticalPath: false
    });

    describe('validateDependency', () => {
        it('should allow valid dependency between different tasks', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Task A'),
                createMockTodo(2, 'Task B'),
                createMockTodo(3, 'Task C')
            ];

            const result = DependencyGraphService.validateDependency(todos, 1, 2);

            expect(result.isValid).toBe(true);
            expect(result.cycle).toBeUndefined();
        });

        it('should prevent self-dependency', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Task A'),
                createMockTodo(2, 'Task B')
            ];

            const result = DependencyGraphService.validateDependency(todos, 1, 1);

            expect(result.isValid).toBe(false);
            expect(result.cycle).toEqual([1]);
        });

        it('should detect simple circular dependency', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Task 1 depends on Task 2
            const todos = [
                createMockTodo(1, 'Task A', [2]),
                createMockTodo(2, 'Task B')
            ];

            // Trying to make Task 2 depend on Task 1 would create a cycle
            const result = DependencyGraphService.validateDependency(todos, 2, 1);

            expect(result.isValid).toBe(false);
            expect(result.cycle).toContain(1);
            expect(result.cycle).toContain(2);
        });

        it('should detect complex circular dependency', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Chain: Task 1 -> Task 2 -> Task 3
            const todos = [
                createMockTodo(1, 'Task A', [2]),
                createMockTodo(2, 'Task B', [3]),
                createMockTodo(3, 'Task C')
            ];

            // Trying to make Task 3 depend on Task 1 would create: 1->2->3->1
            const result = DependencyGraphService.validateDependency(todos, 3, 1);

            expect(result.isValid).toBe(false);
            expect(result.cycle).toContain(1);
            expect(result.cycle).toContain(2);
            expect(result.cycle).toContain(3);
        });

        it('should allow dependency that creates valid parallel paths', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Diamond pattern: Task 4 depends on both Task 2 and Task 3
            // Task 2 and Task 3 both depend on Task 1
            const todos = [
                createMockTodo(1, 'Foundation'),
                createMockTodo(2, 'Branch A', [1]),
                createMockTodo(3, 'Branch B', [1]),
                createMockTodo(4, 'Merge', [2])
            ];

            // Adding dependency from Task 4 to Task 3 should be valid
            const result = DependencyGraphService.validateDependency(todos, 4, 3);

            expect(result.isValid).toBe(true);
        });
    });

    describe('calculateCriticalPath', () => {
        it('should handle empty todo list', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const result = DependencyGraphService.calculateCriticalPath([]);

            expect(result.isValid).toBe(true);
            expect(result.criticalPath).toEqual([]);
            expect(result.scheduleData).toEqual({});
        });

        it('should handle single task with no dependencies', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [createMockTodo(1, 'Solo Task', [], 2)];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);
            expect(result.criticalPath).toEqual([1]);
            expect(result.scheduleData![1].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![1].slack).toBe(0);
        });

        it('should calculate critical path for simple linear sequence', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Linear: Task 1 (2h) -> Task 2 (3h) -> Task 3 (1h)
            const todos = [
                createMockTodo(1, 'First', [], 2),
                createMockTodo(2, 'Second', [1], 3),
                createMockTodo(3, 'Third', [2], 1)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);
            expect(result.criticalPath).toEqual([1, 2, 3]);

            // All tasks should be on critical path in linear sequence
            expect(result.scheduleData![1].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![2].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![3].isOnCriticalPath).toBe(true);

            // All should have zero slack
            expect(result.scheduleData![1].slack).toBe(0);
            expect(result.scheduleData![2].slack).toBe(0);
            expect(result.scheduleData![3].slack).toBe(0);
        });

        it('should identify critical path in parallel task scenario', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Parallel paths with different durations:
            // Path A: Task 1 (1h) -> Task 2 (1h) -> Task 4 (1h) = 3h
            // Path B: Task 1 (1h) -> Task 3 (5h) -> Task 4 (1h) = 7h (CRITICAL)
            const todos = [
                createMockTodo(1, 'Start', [], 1),
                createMockTodo(2, 'Short Branch', [1], 1),
                createMockTodo(3, 'Long Branch', [1], 5),
                createMockTodo(4, 'End', [2, 3], 1)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Critical path should include the longer branch
            expect(result.criticalPath).toContain(1);
            expect(result.criticalPath).toContain(3);
            expect(result.criticalPath).toContain(4);

            // Task 3 (long branch) should be on critical path
            expect(result.scheduleData![3].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![3].slack).toBe(0);

            // Task 2 (short branch) should have slack
            expect(result.scheduleData![2].isOnCriticalPath).toBe(false);
            expect(result.scheduleData![2].slack).toBeGreaterThan(0);
        });

        it('should calculate correct earliest start dates', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Task 1 (2h) -> Task 2 (3h)
            const todos = [
                createMockTodo(1, 'First', [], 2),
                createMockTodo(2, 'Second', [1], 3)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Task 1 should start immediately
            const task1Start = result.scheduleData![1].earliestStart;
            const task1Finish = result.scheduleData![1].earliestFinish;

            // Task 2 should start when Task 1 finishes
            const task2Start = result.scheduleData![2].earliestStart;

            expect(task2Start.getTime()).toBe(task1Finish.getTime());

            // Duration check: Task 1 should finish 2 hours after it starts
            const expectedTask1Duration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
            expect(task1Finish.getTime() - task1Start.getTime()).toBe(expectedTask1Duration);
        });

        it('should handle existing circular dependency gracefully', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Create invalid circular dependency in data
            const todos = [
                createMockTodo(1, 'Task A', [2]),
                createMockTodo(2, 'Task B', [1]) // This creates a cycle
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(false);
            expect(result.circularDependency).toBeDefined();
            expect(result.circularDependency!.cycle).toContain(1);
            expect(result.circularDependency!.cycle).toContain(2);
            expect(result.circularDependency!.message).toContain('Circular dependency detected');
        });

        it('should handle complex dependency network', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Complex network:
            //     1(2h)
            //    /  |  \
            //   2(1h) 3(4h) 4(1h)
            //    \  |  /
            //     5(2h)
            const todos = [
                createMockTodo(1, 'Foundation', [], 2),
                createMockTodo(2, 'Module A', [1], 1),
                createMockTodo(3, 'Module B', [1], 4), // Longest path
                createMockTodo(4, 'Module C', [1], 1),
                createMockTodo(5, 'Integration', [2, 3, 4], 2)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Critical path should go through the longest branch (Module B)
            expect(result.criticalPath).toContain(1);
            expect(result.criticalPath).toContain(3);
            expect(result.criticalPath).toContain(5);

            // Module B (Task 3) should be on critical path
            expect(result.scheduleData![3].isOnCriticalPath).toBe(true);

            // Modules A and C should have slack
            expect(result.scheduleData![2].slack).toBeGreaterThan(0);
            expect(result.scheduleData![4].slack).toBeGreaterThan(0);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle tasks with zero duration', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Instant Task', [], 0),
                createMockTodo(2, 'Normal Task', [1], 2)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);
            expect(result.criticalPath).toEqual([1, 2]);
        });

        it('should handle very large estimated hours', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Massive Task', [], 1000),
                createMockTodo(2, 'Follow Up', [1], 1)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);
            expect(result.scheduleData![1].isOnCriticalPath).toBe(true);
        });

        it('should handle disconnected task graphs', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Two separate chains: 1->2 and 3->4
            const todos = [
                createMockTodo(1, 'Chain A Start', [], 1),
                createMockTodo(2, 'Chain A End', [1], 1),
                createMockTodo(3, 'Chain B Start', [], 2),
                createMockTodo(4, 'Chain B End', [3], 2)
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);
            // Should identify the longer chain as critical
            expect(result.criticalPath).toContain(3);
            expect(result.criticalPath).toContain(4);
        });
    });
});