// app/api/todos/__tests__/due-dates.test.ts

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            status: init?.status || 200,
            json: async () => data
        }))
    }
}));

import { todoService } from '@/lib/services';

jest.mock('../../../../lib/services', () => ({
    todoService: {
        getAllTodos: jest.fn(),
        createTodo: jest.fn(),
    }
}));

// Cast the mocked service for TypeScript
const mockedTodoService = todoService as jest.Mocked<typeof todoService>;

describe('Due Dates API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/todos - with due dates', () => {
        it('should return todos with due dates included', async () => {
            const mockTodos = [
                {
                    id: 1,
                    title: 'Todo with due date',
                    dueDate: new Date('2025-08-25'),
                    createdAt: new Date('2025-08-19'),
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
                    dependents: [],
                    actualStartDate: null,
                    actualEndDate: null
                },
                {
                    id: 2,
                    title: 'Todo without due date',
                    dueDate: null,
                    createdAt: new Date('2025-08-18'),
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
                    dependents: [],
                    actualStartDate: null,
                    actualEndDate: null
                },
            ];

            mockedTodoService.getAllTodos.mockResolvedValue(mockTodos);

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
            const mockResult = {
                newTodo: 1,
                todos: [{
                    id: 1,
                    title: 'Test todo',
                    dueDate: null,
                    createdAt: new Date(),
                    completed: false,
                    estimatedDays: 1,
                    imageUrl: null,
                    imageAlt: null,
                    imageLoading: true,
                    lastImageSearch: null,
                    updatedAt: new Date(),
                    earliestStartDate: null,
                    criticalPathLength: 0,
                    isOnCriticalPath: false,
                    dependencies: [],
                    dependents: [],
                    actualStartDate: null,
                    actualEndDate: null
                }]
            };

            mockedTodoService.createTodo.mockResolvedValue(mockResult);

            const request = {
                async json() { return { title: 'Test todo' }; }
            } as any;

            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.newTodo).toBe(1);
            expect(data.todos).toHaveLength(1);
            expect(data.todos[0].title).toBe('Test todo');
            expect(mockedTodoService.createTodo).toHaveBeenCalledWith({ title: 'Test todo' });
        });

        it('should create todo without due date field (undefined)', async () => {
            const mockResult = {
                newTodo: 1,
                todos: [{
                    id: 1,
                    title: 'Test todo',
                    dueDate: null,
                    createdAt: new Date(),
                    completed: false,
                    estimatedDays: 1,
                    imageUrl: null,
                    imageAlt: null,
                    imageLoading: true,
                    lastImageSearch: null,
                    updatedAt: new Date(),
                    earliestStartDate: null,
                    criticalPathLength: 0,
                    isOnCriticalPath: false,
                    dependencies: [],
                    dependents: [],
                    actualStartDate: null,
                    actualEndDate: null
                }]
            };

            mockedTodoService.createTodo.mockResolvedValue(mockResult);

            const request = {
                async json() { return { title: 'Test todo' }; }
            } as any;

            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.newTodo).toBe(1);
            expect(data.todos).toHaveLength(1);
        });

        it('should create todo with valid due date', async () => {
            const dueDate = '2025-08-25';
            const mockResult = {
                newTodo: 1,
                todos: [{
                    id: 1,
                    title: 'Todo with due date',
                    dueDate: new Date(dueDate),
                    createdAt: new Date(),
                    completed: false,
                    estimatedDays: 1,
                    imageUrl: null,
                    imageAlt: null,
                    imageLoading: true,
                    lastImageSearch: null,
                    updatedAt: new Date(),
                    earliestStartDate: null,
                    criticalPathLength: 0,
                    isOnCriticalPath: false,
                    dependencies: [],
                    dependents: [],
                    actualStartDate: null,
                    actualEndDate: null
                }]
            };

            mockedTodoService.createTodo.mockResolvedValue(mockResult);

            const request = {
                async json() {
                    return {
                        title: 'Todo with due date',
                        dueDate: dueDate
                    };
                }
            } as any;

            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.newTodo).toBe(1);
            expect(data.todos).toHaveLength(1);
            expect(data.todos[0].dueDate).toEqual(new Date(dueDate));
            expect(mockedTodoService.createTodo).toHaveBeenCalledWith({
                title: 'Todo with due date',
                dueDate: dueDate
            });
        });

        it('should reject invalid due date format', async () => {
            mockedTodoService.createTodo.mockRejectedValue(new Error('Invalid due date format'));

            const request = {
                async json() {
                    return {
                        title: 'Valid title',
                        dueDate: 'invalid-date-format'
                    };
                }
            } as any;

            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Invalid due date format' });
        });

        it('should reject missing title', async () => {
            const request = {
                async json() {
                    return { dueDate: '2025-08-25' };
                }
            } as any;

            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Title is required' });
            expect(mockedTodoService.createTodo).not.toHaveBeenCalled();
        });

        it('should reject invalid estimated days', async () => {
            const request = {
                async json() {
                    return {
                        title: 'Test todo',
                        estimatedDays: 500
                    };
                }
            } as any;

            const { POST } = await import('../route');
            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Estimated days must be between 1 and 365' });
            expect(mockedTodoService.createTodo).not.toHaveBeenCalled();
        });
    });
});