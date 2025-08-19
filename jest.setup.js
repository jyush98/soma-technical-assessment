// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
    useRouter() {
        return {
            route: '/',
            pathname: '/',
            query: '',
            asPath: '',
            push: jest.fn(),
            pop: jest.fn(),
            reload: jest.fn(),
            back: jest.fn(),
            prefetch: jest.fn().mockResolvedValue(undefined),
            beforePopState: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn(),
            },
        }
    },
}))

// Mock environment variables for tests
process.env.PEXELS_API_KEY = 'test-api-key'
process.env.DATABASE_URL = 'file:./test.db'

// Global test utilities
global.console = {
    ...console,
    // Suppress console.warn and console.error in tests unless explicitly needed
    warn: jest.fn(),
    error: jest.fn(),
}