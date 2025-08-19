// Mock the entire Prisma client for testing
export const prisma = {
    todo: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
    },
}

// For TypeScript - export the type
export type MockedPrisma = typeof prisma