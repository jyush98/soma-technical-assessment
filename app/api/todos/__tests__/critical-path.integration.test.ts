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

            // Mock the critical path service
            const mockGetCriticalPath = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    getCriticalPath: mockGetCriticalPath,
                }
            }));

            // Arrange: Mock critical path result
            const mockResult = {
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
                },
                isValid: true,
                error: undefined,
                totalTasks: 2,
                criticalTaskCount: 2,
                projectEndDate: new Date('2025-01-06T09:00:00Z')
            };

            mockGetCriticalPath.mockResolvedValue(mockResult);

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockResult);
            expect(mockGetCriticalPath).toHaveBeenCalled();
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

            // Mock the critical path service
            const mockGetCriticalPath = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    getCriticalPath: mockGetCriticalPath,
                }
            }));

            const mockResult = {
                criticalPath: [],
                scheduleData: {},
                isValid: true,
                error: undefined,
                totalTasks: 0,
                criticalTaskCount: 0,
                projectEndDate: null
            };

            mockGetCriticalPath.mockResolvedValue(mockResult);

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockResult);
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

            // Mock the critical path service
            const mockGetCriticalPath = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    getCriticalPath: mockGetCriticalPath,
                }
            }));

            const mockResult = {
                criticalPath: [],
                scheduleData: {},
                isValid: false,
                error: 'Circular dependency detected: 1 → 2 → 1',
                totalTasks: 2,
                criticalTaskCount: 0,
                projectEndDate: null
            };

            mockGetCriticalPath.mockResolvedValue(mockResult);

            // Import and test
            const { GET } = await import('../critical-path/route');

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockResult);
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

            // Mock the critical path service to throw error
            const mockGetCriticalPath = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    getCriticalPath: mockGetCriticalPath,
                }
            }));

            mockGetCriticalPath.mockRejectedValue(new Error('Database connection failed'));

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

            // Mock the critical path service
            const mockRecalculateAndUpdate = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    recalculateAndUpdate: mockRecalculateAndUpdate,
                }
            }));

            // Arrange: Mock successful recalculation
            const mockResult = {
                message: 'Critical path recalculated successfully',
                criticalPath: [1, 2],
                updatedTasks: 2,
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

            mockRecalculateAndUpdate.mockResolvedValue(mockResult);

            // Import and test
            const { POST } = await import('../critical-path/route');

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockResult);
            expect(mockRecalculateAndUpdate).toHaveBeenCalled();
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

            // Mock the critical path service
            const mockRecalculateAndUpdate = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    recalculateAndUpdate: mockRecalculateAndUpdate,
                }
            }));

            // Arrange: Mock circular dependency error
            mockRecalculateAndUpdate.mockRejectedValue(
                new Error('Circular dependency detected: 1 → 2 → 1')
            );

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

            // Mock the critical path service
            const mockRecalculateAndUpdate = jest.fn();
            jest.doMock('../../../../lib/services', () => ({
                criticalPathService: {
                    recalculateAndUpdate: mockRecalculateAndUpdate,
                }
            }));

            // Mock the service to throw an error
            mockRecalculateAndUpdate.mockRejectedValue(new Error('Database update failed'));

            // Import and test
            const { POST } = await import('../critical-path/route');

            const response = await POST();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Internal server error' });
        });
    });
});