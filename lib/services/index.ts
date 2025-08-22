// lib/services/index.ts
import { prisma } from '@/lib/prisma';
import { TodoService } from './todo.services';

export const todoService = new TodoService(prisma);