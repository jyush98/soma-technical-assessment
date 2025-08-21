// lib/types.ts
import { Todo, TodoDependency } from '@prisma/client';

/**
 * Todo with all its relations included
 * Used when fetching todos with include: { dependencies: true, dependents: true }
 */
export interface TodoWithRelations extends Todo {
    dependencies?: TodoDependency[];
    dependents?: TodoDependency[];
}

/**
 * TodoDependency with the related Todo objects
 * Used when fetching dependencies with their related todos
 */
export interface TodoDependencyWithRelations extends TodoDependency {
    todo?: Todo;
    dependsOn?: Todo;
}