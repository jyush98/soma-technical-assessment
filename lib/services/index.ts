// lib/services/index.ts
import { prisma } from '@/lib/prisma';
import { TodoService } from './todo.services';
import { CriticalPathService } from './critical-path.service';
import { DependencyService } from './dependency.service';

export const todoService = new TodoService(prisma);
export const criticalPathService = new CriticalPathService(prisma);
export const dependencyService = new DependencyService(prisma, criticalPathService);