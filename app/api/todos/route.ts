// Helper function to recalculate critical path and update database
async function recalculateCriticalPath() {
  const todos = await prisma.todo.findMany({
    include: {
      dependencies: { select: { dependsOnId: true } },
      dependents: { select: { todoId: true } }
    }
  });

  // Transform to match algorithm interface
  const todosForCalculation = todos.map(t => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    estimatedDays: t.estimatedDays || 1,
    dependencies: t.dependencies,
    dependents: t.dependents,
    earliestStartDate: t.earliestStartDate,
    criticalPathLength: 0,
    isOnCriticalPath: t.isOnCriticalPath
  }));

  const { DependencyGraphService } = await import('@/lib/dependency-graph');
  const result = DependencyGraphService.calculateCriticalPath(todosForCalculation);

  if (result.isValid && result.scheduleData) {
    // Update todos with critical path information in a single transaction
    const updatePromises = Object.entries(result.scheduleData).map(
      ([todoId, scheduleInfo]) =>
        prisma.todo.update({
          where: { id: parseInt(todoId) },
          data: {
            earliestStartDate: scheduleInfo.earliestStart,
            isOnCriticalPath: scheduleInfo.isOnCriticalPath
          }
        })
    );

    await prisma.$transaction(updatePromises);
  }
}// app/api/todos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      include: {
        dependencies: true,
        dependents: true,
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
          completed: false
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
      // Create the todo with imageLoading set to true
      const todo = await tx.todo.create({
        data: {
          title: title.trim(),
          dueDate: parsedDueDate,
          estimatedDays,
          completed: false,
          imageLoading: true, // Set loading state for image generation
        },
      });

      // Create dependency relationships if any
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
              dependsOn: true
            }
          },
          dependents: {
            include: {
              todo: true
            }
          },
        },
      });
    });

    // Trigger image generation asynchronously (non-blocking)
    if (result) {
      generateImageForTodo(result.id, result.title);
    }
    // Recalculate critical path after adding new todo
    await recalculateCriticalPath();

    // Return ALL todos with updated critical path info
    // This ensures the frontend gets the complete updated state
    const allTodos = await prisma.todo.findMany({
      include: {
        dependencies: true,
        dependents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
    }

    return NextResponse.json({
      newTodo: result.id,  // Include the ID of the newly created todo
      todos: allTodos       // Return all todos with updated critical path
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({
      error: 'Error creating todo'
    }, { status: 500 });
  }
}

// Helper function to generate image asynchronously
async function generateImageForTodo(todoId: number, title: string) {
  try {
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    if (!PEXELS_API_KEY) {
      console.error('PEXELS_API_KEY not configured');
      // Clear loading state
      await prisma.todo.update({
        where: { id: todoId },
        data: { imageLoading: false },
      });
      return;
    }

    // Search for images based on title
    const searchQuery = encodeURIComponent(title);
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Pexels');
    }

    const data = await response.json();

    // Update todo with image data
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      await prisma.todo.update({
        where: { id: todoId },
        data: {
          imageUrl: photo.src.medium,
          imageAlt: photo.alt || `Image for ${title}`,
          imageLoading: false,
          lastImageSearch: title,
        },
      });
    } else {
      // No image found, just clear loading state
      await prisma.todo.update({
        where: { id: todoId },
        data: {
          imageLoading: false,
          lastImageSearch: title,
        },
      });
    }
  } catch (error) {
    console.error('Error generating image:', error);
    // Clear loading state on error
    await prisma.todo.update({
      where: { id: todoId },
      data: { imageLoading: false },
    }).catch(() => { }); // Ignore errors in cleanup
  }
}