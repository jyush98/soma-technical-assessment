// app/api/todos/__tests__/dependency.integration.test.ts
import { createMockDependencyService } from '@/lib/test-utils/mock-factory';

describe('Dependencies API Route', () => {
    let mockDependencyService: ReturnType<typeof createMockDependencyService>;

    beforeEach(() => {
        // Reset modules before each test for clean state
        jest.resetModules();
        jest.clearAllMocks();

        // Create fresh mock for each test
        mockDependencyService = createMockDependencyService();

        // Mock the services module
        jest.doMock('../../../../lib/services', () => ({
            dependencyService: mockDependencyService,
        }));
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

            mockDependencyService.getDependencies.mockResolvedValue(mockDependencies);

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
            expect(mockDependencyService.getDependencies).toHaveBeenCalledWith(2);
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

            mockDependencyService.getDependencies.mockRejectedValue(
                new Error('Invalid todo ID')
            );

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

            // Arrange: Mock created dependency
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

            mockDependencyService.addDependency.mockResolvedValue(mockCreatedDependency);

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
            expect(mockDependencyService.addDependency).toHaveBeenCalledWith(2, 1);
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

            // Arrange: Mock circular dependency error
            const circularError = new Error('Circular dependency detected: 1 → 2 → 1');
            (circularError as any).statusCode = 400;
            (circularError as any).cycle = [1, 2, 1];

            mockDependencyService.addDependency.mockRejectedValue(circularError);

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

            mockDependencyService.removeDependency.mockResolvedValue(undefined);

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
            expect(mockDependencyService.removeDependency).toHaveBeenCalledWith(2, 1);
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

            const notFoundError = new Error('Dependency not found');
            (notFoundError as any).statusCode = 404;
            mockDependencyService.removeDependency.mockRejectedValue(notFoundError);

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