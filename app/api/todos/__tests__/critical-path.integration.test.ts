// app/api/todos/__tests__/critical-path.integration.test.ts

describe('Critical Path API Route', () => {
    beforeEach(() => {
        // Reset modules before each test for clean state
        jest.resetModules();
    });

    describe('GET /api/todos/critical-path', () => {
        it('should return critical path calculation', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            // Arrange: Mock todos and critical path result
            const mockTodos = [
                {
                    id: 1,
                    title: 'Task 1',
                    completed: false,
                    estimatedDays: 2,
                    dependencies: [],
                    dependents: [{ todoId: 2 }],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                },
                {
                    id: 2,
                    title: 'Task 2',
                    completed: false,
                    estimatedDays: 3,
                    dependencies: [{ dependsOnId: 1 }],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            const mockCriticalPathResult = {
                isValid: true,
                criticalPath: [1, 2],
                scheduleData: {
                    1: {
                        earliestStart: new Date('2025-01-01T09:00:00Z'),
                        earliestFinish: new Date('2025-01-03T09:00:00Z'),
                        isOnCriticalPath: true,
                        slack: 0
                    },
                    2: {
                        earliestStart: new Date('2025-01-03T09:00:00Z'),
                        earliestFinish: new Date('2025-01-06T09:00:00Z'),
                        isOnCriticalPath: true,
                        slack: 0
                    }
                }
            };

            mockFindMany.mockResolvedValue(mockTodos);
            mockCalculateCriticalPath.mockReturnValue(mockCriticalPathResult);

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                criticalPath: [1, 2],
                scheduleData: mockCriticalPathResult.scheduleData,
                isValid: true,
                error: undefined,
                totalTasks: 2,
                criticalTaskCount: 2,
                projectEndDate: new Date('2025-01-06T09:00:00Z')
            });
            expect(mockCalculateCriticalPath).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        title: 'Task 1',
                        completed: false,
                        estimatedDays: 2
                    })
                ])
            );
        });

        it('should handle empty task list', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            mockFindMany.mockResolvedValue([]);
            mockCalculateCriticalPath.mockReturnValue({
                isValid: true,
                criticalPath: [],
                scheduleData: {}
            });

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                criticalPath: [],
                scheduleData: {},
                isValid: true,
                error: undefined,
                totalTasks: 0,
                criticalTaskCount: 0,
                projectEndDate: null
            });
        });

        it('should handle circular dependency error', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            // Arrange: Mock circular dependency scenario
            const mockTodos = [
                {
                    id: 1,
                    title: 'Task 1',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [{ dependsOnId: 2 }],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                },
                {
                    id: 2,
                    title: 'Task 2',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [{ dependsOnId: 1 }],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            mockFindMany.mockResolvedValue(mockTodos);
            mockCalculateCriticalPath.mockReturnValue({
                isValid: false,
                circularDependency: {
                    cycle: [1, 2, 1],
                    message: 'Circular dependency detected: 1 → 2 → 1'
                }
            });

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                criticalPath: [],
                scheduleData: {},
                isValid: false,
                error: 'Circular dependency detected: 1 → 2 → 1',
                totalTasks: 2,
                criticalTaskCount: 0,
                projectEndDate: null
            });
        });

        it('should handle database errors', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 500,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma to throw error
            const mockFindMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                    },
                },
            }));

            mockFindMany.mockRejectedValue(new Error('Database connection failed'));

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Internal server error' });
        });
    });

    describe('POST /api/todos/critical-path', () => {
        it('should recalculate and update critical path', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindMany = jest.fn();
            const mockUpdate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                        update: mockUpdate,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            // Arrange: Mock successful recalculation
            const mockTodos = [
                {
                    id: 1,
                    title: 'Task 1',
                    completed: false,
                    estimatedDays: 2,
                    dependencies: [],
                    dependents: [{ todoId: 2 }],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                },
                {
                    id: 2,
                    title: 'Task 2',
                    completed: false,
                    estimatedDays: 3,
                    dependencies: [{ dependsOnId: 1 }],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            const mockCriticalPathResult = {
                isValid: true,
                criticalPath: [1, 2],
                scheduleData: {
                    1: {
                        earliestStart: new Date('2025-01-01T09:00:00Z'),
                        isOnCriticalPath: true
                    },
                    2: {
                        earliestStart: new Date('2025-01-03T09:00:00Z'),
                        isOnCriticalPath: true
                    }
                }
            };

            mockFindMany.mockResolvedValue(mockTodos);
            mockCalculateCriticalPath.mockReturnValue(mockCriticalPathResult);
            mockUpdate.mockResolvedValue({});

            // Import and test
            const { POST } = await import('../critical-path/route');

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                message: 'Critical path recalculated successfully',
                criticalPath: [1, 2],
                updatedTasks: 2,
                scheduleData: mockCriticalPathResult.scheduleData
            });

            // Verify all todos were updated
            expect(mockUpdate).toHaveBeenCalledTimes(2);
            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    earliestStartDate: mockCriticalPathResult.scheduleData[1].earliestStart,
                    isOnCriticalPath: true
                }
            });
        });

        it('should handle circular dependency during recalculation', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 400,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            // Arrange: Mock circular dependency
            const mockTodos = [
                {
                    id: 1,
                    title: 'Task 1',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [{ dependsOnId: 2 }],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                },
                {
                    id: 2,
                    title: 'Task 2',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [{ dependsOnId: 1 }],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            mockFindMany.mockResolvedValue(mockTodos);
            mockCalculateCriticalPath.mockReturnValue({
                isValid: false,
                circularDependency: {
                    message: 'Circular dependency detected: 1 → 2 → 1'
                }
            });

            // Import and test
            const { POST } = await import('../critical-path/route');

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({
                error: 'Cannot calculate critical path',
                reason: 'Circular dependency detected: 1 → 2 → 1'
            });
        });

        it('should handle database update errors', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 500,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma to throw error during update
            const mockFindMany = jest.fn();
            const mockUpdate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                        update: mockUpdate,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            mockFindMany.mockResolvedValue([{
                id: 1,
                title: 'Task 1',
                completed: false,
                estimatedDays: 1,
                dependencies: [],
                dependents: [],
                earliestStartDate: null,
                isOnCriticalPath: false
            }]);
            mockCalculateCriticalPath.mockReturnValue({
                isValid: true,
                criticalPath: [1],
                scheduleData: {
                    1: { earliestStart: new Date(), isOnCriticalPath: true }
                }
            });
            mockUpdate.mockRejectedValue(new Error('Database update failed'));

            // Import and test
            const { POST } = await import('../critical-path/route');

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Internal server error' });
        });
    });
});