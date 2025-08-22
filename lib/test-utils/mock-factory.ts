// lib/test-utils/mock-factory.ts

interface MockPrismaClient {
    todo: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
        delete: jest.Mock;
        deleteMany: jest.Mock;
        count: jest.Mock;
    };
    todoDependency: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        createMany: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
    $connect: jest.Mock;
    $disconnect: jest.Mock;
}

export function createMockPrismaClient(): MockPrismaClient {
    const mockClient: MockPrismaClient = {
        todo: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        todoDependency: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => {
            // If callback is an array (for batch operations), just resolve it
            if (Array.isArray(callback)) {
                return Promise.resolve(callback);
            }
            // If it's a function, execute it with a new mock client to avoid circular reference
            return callback({
                todo: {
                    findMany: jest.fn(),
                    findUnique: jest.fn(),
                    findFirst: jest.fn(),
                    create: jest.fn(),
                    update: jest.fn(),
                    updateMany: jest.fn(),
                    delete: jest.fn(),
                    deleteMany: jest.fn(),
                    count: jest.fn(),
                },
                todoDependency: {
                    findMany: jest.fn(),
                    findUnique: jest.fn(),
                    create: jest.fn(),
                    createMany: jest.fn(),
                    update: jest.fn(),
                    delete: jest.fn(),
                    deleteMany: jest.fn(),
                },
                $transaction: jest.fn(),
                $connect: jest.fn(),
                $disconnect: jest.fn(),
            });
        }),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };

    return mockClient;
}

export function createMockTodoService() {
    return {
        getAllTodos: jest.fn(),
        createTodo: jest.fn(),
        updateTodo: jest.fn(),
        deleteTodo: jest.fn(),
    };
}

export function createMockCriticalPathService() {
    return {
        getCriticalPath: jest.fn(),
        recalculateAndUpdate: jest.fn(),
    };
}

export function createMockDependencyService() {
    return {
        getDependencies: jest.fn(),
        addDependency: jest.fn(),
        removeDependency: jest.fn(),
    };
}

export function createMockPexelsService() {
    return {
        searchImage: jest.fn(),
        generateAndSaveImage: jest.fn(),
    };
}