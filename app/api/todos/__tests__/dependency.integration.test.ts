// app/api/todos/__tests__/dependencies.integration.test.ts

describe('Dependencies API Route', () => {
    beforeEach(() => {
        // Reset modules before each test for clean state
        jest.resetModules();
    });

    describe('GET /api/todos/[id]/dependencies', () => {
        it('should return dependencies for a todo', async () => {
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
                    todoDependency: {
                        findMany: mockFindMany,
                    },
                },
            }));

            // Arrange: Mock dependencies
            const mockDependencies = [
                {
                    id: 1,
                    todoId: 2,
                    dependsOnId: 1,
                    dependsOn: {
                        id: 1,
                        title: 'Foundation Task',
                        completed: false
                    },
                    createdAt: new Date()
                }
            ];

            mockFindMany.mockResolvedValue(mockDependencies);

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/2/dependencies'
            } as any;

            // Import and test
            const { GET } = await import('../[id]/dependencies/route');

            const response = await GET(request, { params: { id: '2' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockDependencies);
            expect(mockFindMany).toHaveBeenCalledWith({
                where: { todoId: 2 },
                include: {
                    dependsOn: {
                        select: { id: true, title: true, completed: true }
                    }
                }
            });
        });

        it('should handle invalid todo ID', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 400,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/invalid/dependencies'
            } as any;

            // Import and test
            const { GET } = await import('../[id]/dependencies/route');

            const response = await GET(request, { params: { id: 'invalid' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Invalid todo ID' });
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
                    todoDependency: {
                        findMany: mockFindMany,
                    },
                },
            }));

            mockFindMany.mockRejectedValue(new Error('Database error'));

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/1/dependencies'
            } as any;

            // Import and test
            const { GET } = await import('../[id]/dependencies/route');

            const response = await GET(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Internal server error' });
        });
    });

    describe('POST /api/todos/[id]/dependencies', () => {
        it('should create valid dependency', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 201,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            const mockFindMany = jest.fn();
            const mockCreate = jest.fn();
            const mockUpdate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                        findMany: mockFindMany,
                        update: mockUpdate,
                    },
                    todoDependency: {
                        create: mockCreate,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockValidateDependency = jest.fn();
            const mockCalculateCriticalPath = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    validateDependency: mockValidateDependency,
                    calculateCriticalPath: mockCalculateCriticalPath,
                },
            }));

            // Arrange: Mock existing todos
            const mockTodo1 = { id: 1, title: 'Task 1' };
            const mockTodo2 = { id: 2, title: 'Task 2' };
            const mockTodos = [
                {
                    id: 1,
                    title: 'Task 1',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                },
                {
                    id: 2,
                    title: 'Task 2',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            const mockCreatedDependency = {
                id: 1,
                todoId: 2,
                dependsOnId: 1,
                dependsOn: {
                    id: 1,
                    title: 'Task 1',
                    completed: false
                },
                createdAt: new Date()
            };

            mockFindUnique
                .mockResolvedValueOnce(mockTodo2) // First call for todoId
                .mockResolvedValueOnce(mockTodo1); // Second call for dependsOnId
            mockFindMany.mockResolvedValue(mockTodos);
            mockValidateDependency.mockReturnValue({ isValid: true });
            mockCalculateCriticalPath.mockReturnValue({
                isValid: true,
                criticalPath: [1, 2],
                scheduleData: {
                    1: { earliestStart: new Date(), isOnCriticalPath: true },
                    2: { earliestStart: new Date(), isOnCriticalPath: true }
                }
            });
            mockCreate.mockResolvedValue(mockCreatedDependency);
            mockUpdate.mockResolvedValue({});

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/2/dependencies',
                async json() {
                    return { dependsOnId: 1 };
                }
            } as any;

            // Import and test
            const { POST } = await import('../[id]/dependencies/route');

            const response = await POST(request, { params: { id: '2' } });
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data).toEqual(mockCreatedDependency);
            expect(mockValidateDependency).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        title: 'Task 1', // Should map title to title
                        completed: false,
                        estimatedDays: 1
                    })
                ]),
                2,
                1
            );
            expect(mockCreate).toHaveBeenCalledWith({
                data: { todoId: 2, dependsOnId: 1 },
                include: {
                    dependsOn: {
                        select: { id: true, title: true, completed: true }
                    }
                }
            });
        });

        it('should prevent circular dependency', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 400,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            const mockFindMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                        findMany: mockFindMany,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockValidateDependency = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    validateDependency: mockValidateDependency,
                },
            }));

            // Arrange: Mock circular dependency scenario
            const mockTodo1 = { id: 1, title: 'Task 1' };
            const mockTodo2 = { id: 2, title: 'Task 2' };
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
                    dependencies: [],
                    dependents: [{ todoId: 1 }],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            mockFindUnique
                .mockResolvedValueOnce(mockTodo1)
                .mockResolvedValueOnce(mockTodo2);
            mockFindMany.mockResolvedValue(mockTodos);
            mockValidateDependency.mockReturnValue({
                isValid: false,
                cycle: [1, 2, 1]
            });

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/1/dependencies',
                async json() {
                    return { dependsOnId: 2 };
                }
            } as any;

            // Import and test
            const { POST } = await import('../[id]/dependencies/route');

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Circular dependency detected');
            expect(data.cycle).toEqual([1, 2, 1]);
            expect(data.message).toContain('Adding this dependency would create a cycle');
        });

        it('should handle todo not found', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 404,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                    },
                },
            }));

            mockFindUnique
                .mockResolvedValueOnce(null) // First call returns null
                .mockResolvedValueOnce({ id: 2, title: 'Task 2' });

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/999/dependencies',
                async json() {
                    return { dependsOnId: 1 };
                }
            } as any;

            // Import and test
            const { POST } = await import('../[id]/dependencies/route');

            const response = await POST(request, { params: { id: '999' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data).toEqual({ error: 'One or both todos not found' });
        });

        it('should handle duplicate dependency', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 409,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            const mockFindMany = jest.fn();
            const mockCreate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                        findMany: mockFindMany,
                    },
                    todoDependency: {
                        create: mockCreate,
                    },
                },
            }));

            // Mock DependencyGraphService
            const mockValidateDependency = jest.fn();
            jest.doMock('../../../../lib/dependency-graph', () => ({
                DependencyGraphService: {
                    validateDependency: mockValidateDependency,
                },
            }));

            // Arrange: Mock duplicate constraint error
            const mockTodo1 = { id: 1, title: 'Task 1' };
            const mockTodo2 = { id: 2, title: 'Task 2' };
            const mockTodos = [
                {
                    id: 1,
                    title: 'Task 1',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                },
                {
                    id: 2,
                    title: 'Task 2',
                    completed: false,
                    estimatedDays: 1,
                    dependencies: [],
                    dependents: [],
                    earliestStartDate: null,
                    isOnCriticalPath: false
                }
            ];

            mockFindUnique
                .mockResolvedValueOnce(mockTodo2)
                .mockResolvedValueOnce(mockTodo1);
            mockFindMany.mockResolvedValue(mockTodos);
            mockValidateDependency.mockReturnValue({ isValid: true });

            // Mock Prisma unique constraint error
            const constraintError: any = new Error('Unique constraint failed');
            constraintError.code = 'P2002';
            mockCreate.mockRejectedValue(constraintError);

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/2/dependencies',
                async json() {
                    return { dependsOnId: 1 };
                }
            } as any;

            // Import and test
            const { POST } = await import('../[id]/dependencies/route');

            const response = await POST(request, { params: { id: '2' } });
            const data = await response.json();

            expect(response.status).toBe(409);
            expect(data).toEqual({ error: 'Dependency already exists' });
        });
    });

    describe('DELETE /api/todos/[id]/dependencies', () => {
        it('should delete existing dependency', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockDeleteMany = jest.fn();
            const mockFindMany = jest.fn();
            const mockUpdate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findMany: mockFindMany,
                        update: mockUpdate,
                    },
                    todoDependency: {
                        deleteMany: mockDeleteMany,
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

            mockDeleteMany.mockResolvedValue({ count: 1 });
            mockFindMany.mockResolvedValue([]);
            mockCalculateCriticalPath.mockReturnValue({
                isValid: true,
                criticalPath: [],
                scheduleData: {}
            });

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/2/dependencies?dependsOnId=1'
            } as any;

            // Import and test
            const { DELETE } = await import('../[id]/dependencies/route');

            const response = await DELETE(request, { params: { id: '2' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({ success: true });
            expect(mockDeleteMany).toHaveBeenCalledWith({
                where: { todoId: 2, dependsOnId: 1 }
            });
        });

        it('should handle dependency not found', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 404,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockDeleteMany = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todoDependency: {
                        deleteMany: mockDeleteMany,
                    },
                },
            }));

            mockDeleteMany.mockResolvedValue({ count: 0 });

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/2/dependencies?dependsOnId=999'
            } as any;

            // Import and test
            const { DELETE } = await import('../[id]/dependencies/route');

            const response = await DELETE(request, { params: { id: '2' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data).toEqual({ error: 'Dependency not found' });
        });
    });
});