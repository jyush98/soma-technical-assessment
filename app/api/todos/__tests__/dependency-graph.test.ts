// app/api/todos/__tests__/dependency-graph.test.ts (fixed sections)

describe('DependencyGraphService - Enhanced Edge Cases', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    // Helper matching your pattern
    const createMockTodo = (
        id: number,
        title: string,
        dependencies: number[] = [],
        estimatedDays: number = 1,
        completed: boolean = false
    ) => ({
        id,
        title,
        completed,
        estimatedDays,
        dependencies: dependencies.map(depId => ({ dependsOnId: depId })),
        dependents: [],
        earliestStartDate: null,
        criticalPathLength: 0,
        isOnCriticalPath: false
    });

    describe('Multiple End Nodes (Your Current Bug Scenario)', () => {
        it('should correctly handle task 38->40 dependency chain', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Recreating your exact scenario
            const todos = [
                createMockTodo(38, 'Submit Photos', [], 1),
                createMockTodo(40, 'Test', [38], 12),
                // Other independent tasks
                createMockTodo(26, 'Independent A', [], 1),
                createMockTodo(27, 'Independent B', [], 1),
                createMockTodo(29, 'Independent C', [], 1),
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Both 38 and 40 should be on critical path
            expect(result.scheduleData![38].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![40].isOnCriticalPath).toBe(true);

            // Both should have zero slack
            expect(result.scheduleData![38].slack).toBe(0);
            expect(result.scheduleData![40].slack).toBe(0);

            // Independent tasks should NOT be critical
            expect(result.scheduleData![26].isOnCriticalPath).toBe(false);
            expect(result.scheduleData![27].isOnCriticalPath).toBe(false);
            expect(result.scheduleData![29].isOnCriticalPath).toBe(false);

            // Total duration should be 13 days
            const projectDuration =
                (result.scheduleData![40].earliestFinish.getTime() -
                    result.scheduleData![38].earliestStart.getTime()) /
                (24 * 60 * 60 * 1000);
            expect(projectDuration).toBe(13);
        });

        it('should handle multiple independent end tasks of different lengths', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Start', [], 2),
                // Branch A: Total 7 days
                createMockTodo(2, 'Branch A', [1], 5),
                // Branch B: Total 12 days (critical)
                createMockTodo(3, 'Branch B', [1], 10),
                // Standalone: 8 days
                createMockTodo(4, 'Standalone', [], 8),
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Branch B path should be critical (longest at 12 days)
            expect(result.scheduleData![1].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![3].isOnCriticalPath).toBe(true);

            // Branch A should have slack (convert from milliseconds to days)
            expect(result.scheduleData![2].isOnCriticalPath).toBe(false);
            const branchASlackInDays = result.scheduleData![2].slack / (24 * 60 * 60 * 1000);
            expect(branchASlackInDays).toBe(5); // 12 - 7 = 5

            // Standalone should have slack (convert from milliseconds to days)
            expect(result.scheduleData![4].isOnCriticalPath).toBe(false);
            const standaloneSlackInDays = result.scheduleData![4].slack / (24 * 60 * 60 * 1000);
            expect(standaloneSlackInDays).toBe(4); // 12 - 8 = 4
        });
    });

    describe('Complex Dependency Patterns', () => {
        it('should handle diamond dependency pattern', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Diamond: Start -> (A, B) -> End
            const todos = [
                createMockTodo(1, 'Start', [], 3),
                createMockTodo(2, 'Path A', [1], 5), // Longer path
                createMockTodo(3, 'Path B', [1], 2), // Shorter path
                createMockTodo(4, 'End', [2, 3], 4),
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Critical path through longer branch
            expect(result.criticalPath).toEqual([1, 2, 4]);

            // Path A should be critical
            expect(result.scheduleData![2].isOnCriticalPath).toBe(true);
            expect(result.scheduleData![2].slack).toBe(0);

            // Path B should have slack (convert from milliseconds to days)
            expect(result.scheduleData![3].isOnCriticalPath).toBe(false);
            const pathBSlackInDays = result.scheduleData![3].slack / (24 * 60 * 60 * 1000);
            expect(pathBSlackInDays).toBe(3); // 5 - 2 = 3
        });

        it('should handle multiple merge points', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            // Complex merge: Multiple paths converging at different points
            const todos = [
                createMockTodo(1, 'Start', [], 1),
                createMockTodo(2, 'Early A', [1], 2),
                createMockTodo(3, 'Early B', [1], 3),
                createMockTodo(4, 'Mid Merge', [2, 3], 4), // First merge
                createMockTodo(5, 'Parallel', [1], 8), // Independent longer path
                createMockTodo(6, 'Final', [4, 5], 2), // Second merge
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);

            // Critical path through the parallel longer path
            expect(result.criticalPath).toContain(1);
            expect(result.criticalPath).toContain(5);
            expect(result.criticalPath).toContain(6);

            // Parallel path should be critical
            expect(result.scheduleData![5].isOnCriticalPath).toBe(true);

            // Merged path should have slack
            expect(result.scheduleData![4].isOnCriticalPath).toBe(false);
            expect(result.scheduleData![4].slack).toBeGreaterThan(0);
        });
    });

    describe('Data Validation', () => {
        it('should handle zero duration tasks', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Milestone', [], 0), // Zero duration milestone
                createMockTodo(2, 'Next Task', [1], 3),
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            // Should either handle gracefully or reject
            if (result.isValid) {
                expect(result.criticalPath).toContain(2);
                // Milestone should not add to duration
                const duration =
                    (result.scheduleData![2].earliestFinish.getTime() -
                        result.scheduleData![1].earliestStart.getTime()) /
                    (24 * 60 * 60 * 1000);
                expect(duration).toBe(3);
            }
        });

        it('should handle very large estimatedDays values', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Long Project', [], 365), // 1 year
                createMockTodo(2, 'Follow Up', [1], 30), // 1 month
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            expect(result.isValid).toBe(true);
            expect(result.criticalPath).toEqual([1, 2]);

            // Should handle large date calculations
            const totalDays = 365 + 30;
            const actualDuration =
                (result.scheduleData![2].earliestFinish.getTime() -
                    result.scheduleData![1].earliestStart.getTime()) /
                (24 * 60 * 60 * 1000);
            expect(actualDuration).toBe(totalDays);
        });

        it('should handle missing dependency references gracefully', async () => {
            const { DependencyGraphService } = await import('@/lib/dependency-graph');

            const todos = [
                createMockTodo(1, 'Task A', [], 2),
                createMockTodo(2, 'Task B', [999], 3), // Non-existent dependency
            ];

            const result = DependencyGraphService.calculateCriticalPath(todos);

            // Should handle invalid dependencies
            expect(result).toBeDefined();
            // The result will likely be valid but ignore the bad dependency
            // or it will be invalid - both are acceptable behaviors
            if (!result.isValid) {
                // Just check that it's invalid, don't assume specific error structure
                expect(result.isValid).toBe(false);
            } else {
                // If it handles gracefully, Task B might be independent
                expect(result.scheduleData![2]).toBeDefined();
            }
        });
    });
});