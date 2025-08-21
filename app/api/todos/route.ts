import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      include: {
        dependencies: true, // Include dependency relationships
        dependents: true,   // Include tasks that depend on this one
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, estimatedDays = 1, dependencies = [] } = await request.json();

    // Validate required fields
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate estimated days
    if (estimatedDays < 1 || estimatedDays > 365) {
      return NextResponse.json({ error: 'Estimated days must be between 1 and 365' }, { status: 400 });
    }

    // Validate due date format if provided
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 });
      }
    }

    // Validate dependencies exist and are not completed
    if (dependencies.length > 0) {
      const existingTodos = await prisma.todo.findMany({
        where: {
          id: { in: dependencies },
          completed: false // Only allow dependencies on incomplete tasks
        }
      });

      if (existingTodos.length !== dependencies.length) {
        return NextResponse.json({
          error: 'One or more dependency tasks not found or are completed'
        }, { status: 400 });
      }
    }

    // Create the todo with dependencies in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // First create the todo
      const todo = await tx.todo.create({
        data: {
          title: title.trim(),
          dueDate: parsedDueDate,
          estimatedDays,
          completed: false,
        },
      });

      // Then create dependency relationships if any
      if (dependencies.length > 0) {
        await tx.todoDependency.createMany({
          data: dependencies.map((dependsOnId: number) => ({
            todoId: todo.id,
            dependsOnId,
          })),
        });
      }

      // Return the todo with its dependencies
      return await tx.todo.findUnique({
        where: { id: todo.id },
        include: {
          dependencies: {
            include: {
              dependsOn: true // Include the actual todo data for dependencies
            }
          },
          dependents: {
            include: {
              todo: true // Include the actual todo data for dependents
            }
          },
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({
      error: 'Error creating todo'
    }, { status: 500 });
  }
}