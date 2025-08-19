describe('Due Dates API Tests', () => {

    beforeEach(() => {
        // Reset modules before each test for clean state
        jest.resetModules();
    });

    describe('GET /api/todos - with due dates', () => {
        it('should return todos with due dates included', async () => {
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
                    todo: { findMany: mockFindMany, create: jest.fn() },
                },
            }));

            // Mock data with due dates
            const mockTodos = [
                {
                    id: 1,
                    title: 'Todo with due date',
                    dueDate: new Date('2025-08-25'),
                    createdAt: new Date('2025-08-19'),
                },
                {
                    id: 2,
                    title: 'Todo without due date',
                    dueDate: null,
                    createdAt: new Date('2025-08-18'),
                },
            ];

            mockFindMany.mockResolvedValue(mockTodos);

            // Import and test
            const { GET } = await import('../route');
            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual(mockTodos);
            expect(data[0].dueDate).toBeDefined();
            expect(data[1].dueDate).toBeNull();
        });
    });

    describe('POST /api/todos - with due dates', () => {
        it('should create todo without due date', async () => {
            // Setup mocks
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson },
                NextRequest: class {
                    constructor(public url: string, public options: any) { }
                    async json() { return { title: 'Test todo' }; }
                }
            }));

            const mockCreate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: { findMany: jest.fn(), create: mockCreate },
                },
            }));

            const mockTodo = {
                id: 1,
                title: 'Test todo',
                dueDate: null,
                createdAt: new Date(),
            };

            mockCreate.mockResolvedValue(mockTodo);

            // Create mock request - explicitly no due date
            const request = {
                async json() { return { title: 'Test todo', dueDate: null }; }
            } as any;

            // Import and test
            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            // Debug: log the actual response if it fails
            if (response.status !== 201) {
                console.log('Unexpected status:', response.status);
                console.log('Response data:', data);
            }

            expect(response.status).toBe(201);
            expect(data).toEqual(mockTodo);
            expect(mockCreate).toHaveBeenCalledWith({
                data: {
                    title: 'Test todo',
                    dueDate: null,
                },
            });
        });

        it('should create todo without due date field (undefined)', async () => {
            // Setup mocks
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 201,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            const mockCreate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: { findMany: jest.fn(), create: mockCreate },
                },
            }));

            const mockTodo = {
                id: 1,
                title: 'Test todo',
                dueDate: null,
                createdAt: new Date(),
            };

            mockCreate.mockResolvedValue(mockTodo);

            // Create mock request - dueDate field completely omitted
            const request = {
                async json() { return { title: 'Test todo' }; }
            } as any;

            // Import and test
            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            // Debug: log the actual response if it fails
            if (response.status !== 201) {
                console.log('Unexpected status (undefined case):', response.status);
                console.log('Response data (undefined case):', data);
            }

            expect(response.status).toBe(201);
            expect(data).toEqual(mockTodo);
            expect(mockCreate).toHaveBeenCalledWith({
                data: {
                    title: 'Test todo',
                    dueDate: null,
                },
            });
        });

        it('should create todo with valid due date', async () => {
            // Setup mocks
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 201,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            const mockCreate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: { findMany: jest.fn(), create: mockCreate },
                },
            }));

            const dueDate = '2025-08-25';
            const mockTodo = {
                id: 1,
                title: 'Todo with due date',
                dueDate: new Date(dueDate),
                createdAt: new Date(),
            };

            mockCreate.mockResolvedValue(mockTodo);

            // Create mock request with due date
            const request = {
                async json() {
                    return {
                        title: 'Todo with due date',
                        dueDate: dueDate
                    };
                }
            } as any;

            // Import and test
            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data).toEqual(mockTodo);
            expect(mockCreate).toHaveBeenCalledWith({
                data: {
                    title: 'Todo with due date',
                    dueDate: new Date(dueDate),
                },
            });
        });

        it('should reject invalid due date format', async () => {
            // Setup mocks for error case
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 400,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            const mockCreate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: { findMany: jest.fn(), create: mockCreate },
                },
            }));

            // Create mock request with invalid due date
            const request = {
                async json() {
                    return {
                        title: 'Valid title',
                        dueDate: 'invalid-date-format'
                    };
                }
            } as any;

            // Import and test
            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Invalid due date format' });
            expect(mockCreate).not.toHaveBeenCalled();
        });
    });
});