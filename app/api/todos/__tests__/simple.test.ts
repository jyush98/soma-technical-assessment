// app/api/todos/__tests__/simple.test.ts (fixed GET test)

describe('Prisma Mock Test', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('should test GET endpoint with mocked dependencies', async () => {
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
                todo: { findMany: mockFindMany },
            },
        }));

        // Mock data
        const mockTodos = [
            {
                id: 1,
                title: 'Test todo',
                createdAt: new Date('2025-08-19'),
                dueDate: null,
                completed: false,
                estimatedDays: 1,
                imageUrl: null,
                imageAlt: null,
                imageLoading: false,
                lastImageSearch: null,
                updatedAt: new Date(),
                earliestStartDate: null,
                criticalPathLength: 0,
                isOnCriticalPath: false,
                dependencies: [],
                dependents: []
            },
        ];

        mockFindMany.mockResolvedValue(mockTodos);

        // Import and test
        const { GET } = await import('../route');
        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockTodos);

        // Updated expectation to match actual API implementation
        expect(mockFindMany).toHaveBeenCalledWith({
            orderBy: { createdAt: 'desc' },
            include: {
                dependencies: true,
                dependents: true
            }
        });
    });
});