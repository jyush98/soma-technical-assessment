// __mocks__/lib/services/index.ts
import {
    createMockTodoService,
    createMockCriticalPathService,
    createMockDependencyService
} from '@/lib/test-utils/mock-factory';

export const todoService = createMockTodoService();
export const criticalPathService = createMockCriticalPathService();
export const dependencyService = createMockDependencyService();