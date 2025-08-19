// Simple test to verify Jest is working
describe('Basic Jest Test', () => {
    it('should pass a basic test', () => {
        expect(1 + 1).toBe(2);
    });

    it('should handle async', async () => {
        const result = await Promise.resolve('hello');
        expect(result).toBe('hello');
    });
});

// Test importing our route handlers with proper Next.js environment
describe('Route Import Test', () => {
    beforeAll(() => {
        // Mock Next.js Request and Response globals for testing
        global.Request = class MockRequest {
            constructor(public url: string, public init?: any) { }
            async json() { return {}; }
        } as any;

        global.Response = class MockResponse {
            constructor(public body?: any, public init?: any) { }
        } as any;
    });

    it('should import route handlers', async () => {
        // Try to import our route
        const { GET, POST } = await import('../route');

        expect(typeof GET).toBe('function');
        expect(typeof POST).toBe('function');
    });
});

// Test Prisma mocking step by step
describe('Prisma Mock Test', () => {

    it('should mock prisma successfully', async () => {
        // Mock NextResponse first
        jest.doMock('next/server', () => ({
            NextResponse: {
                json: jest.fn((data: any, init?: any) => ({
                    status: init?.status || 200,
                    async json() { return data; }
                }))
            }
        }));

        // Mock Prisma
        jest.doMock('../../../../lib/prisma', () => ({
            prisma: {
                todo: {
                    findMany: jest.fn(),
                    create: jest.fn(),
                },
            },
        }));

        // Import prisma after mocking
        const { prisma } = await import('../../../../lib/prisma');

        expect(prisma.todo.findMany).toBeDefined();
        expect(typeof prisma.todo.findMany).toBe('function');
    });

    it('should test GET endpoint with mocked dependencies', async () => {
        // Clear module cache to ensure fresh imports
        jest.resetModules();

        // Mock NextResponse before importing route
        const mockJson = jest.fn((data: any, init?: any) => ({
            status: init?.status || 200,
            async json() { return data; }
        }));

        jest.doMock('next/server', () => ({
            NextResponse: {
                json: mockJson
            }
        }));

        // Mock Prisma
        const mockFindMany = jest.fn();
        jest.doMock('../../../../lib/prisma', () => ({
            prisma: {
                todo: {
                    findMany: mockFindMany,
                    create: jest.fn(),
                },
            },
        }));

        // Set up mock return value
        const mockTodos = [{ id: 1, title: 'Test todo', createdAt: new Date() }];
        mockFindMany.mockResolvedValue(mockTodos);

        // Import route after mocking
        const { GET } = await import('../route');

        // Call the GET function
        const response = await GET();
        const data = await response.json();

        // Verify results
        expect(response.status).toBe(200);
        expect(data).toEqual(mockTodos);
        expect(mockFindMany).toHaveBeenCalledWith({
            orderBy: { createdAt: 'desc' }
        });
    });
});