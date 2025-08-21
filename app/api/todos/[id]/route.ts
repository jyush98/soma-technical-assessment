// app/api/todos/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const todo = await prisma.todo.findUnique({
      where: { id },
      include: {
        dependencies: true,
        dependents: true,
      },
    });

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json({ error: 'Error fetching todo' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    const body = await request.json();
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if todo exists
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    let shouldRecalculate = false;

    // Handle completed toggle - triggers recalculation
    if (typeof body.completed === 'boolean') {
      updateData.completed = body.completed;
      shouldRecalculate = true; // Completion changes affect critical path
    }

    // Handle title update
    if (body.title && body.title.trim() !== '') {
      updateData.title = body.title.trim();
    }

    // Handle due date update
    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        updateData.dueDate = null;
      } else {
        const parsedDate = new Date(body.dueDate);
        if (!isNaN(parsedDate.getTime())) {
          updateData.dueDate = parsedDate;
        }
      }
    }

    // Handle estimated days update - triggers recalculation
    if (body.estimatedDays !== undefined) {
      const days = parseInt(body.estimatedDays);
      if (days >= 1 && days <= 365) {
        updateData.estimatedDays = days;
        shouldRecalculate = true; // Duration changes affect critical path
      }
    }

    // Update the todo
    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: updateData,
      include: {
        dependencies: true,
        dependents: true,
      },
    });

    // Recalculate critical path if needed
    if (shouldRecalculate) {
      await recalculateCriticalPath();

      // Fetch the todo again to get updated critical path info
      const todoWithCriticalPath = await prisma.todo.findUnique({
        where: { id },
        include: {
          dependencies: true,
          dependents: true,
        },
      });

      // If title changed, trigger image generation (async)
      if (body.title && body.title !== existingTodo.title) {
        await prisma.todo.update({
          where: { id },
          data: { imageLoading: true },
        });
        generateImageForTodo(id, body.title);
      }

      return NextResponse.json(todoWithCriticalPath);
    }

    // If title changed but no recalculation needed
    if (body.title && body.title !== existingTodo.title) {
      await prisma.todo.update({
        where: { id },
        data: { imageLoading: true },
      });
      generateImageForTodo(id, body.title);
    }

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Error updating todo' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.todo.delete({
      where: { id },
    });

    // Recalculate critical path after deletion
    await recalculateCriticalPath();

    return NextResponse.json({
      message: 'Todo deleted and critical path updated'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Error deleting todo' }, { status: 500 });
  }
}

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
}

// Helper function to generate image asynchronously
async function generateImageForTodo(todoId: number, title: string) {
  try {
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    if (!PEXELS_API_KEY) {
      console.error('PEXELS_API_KEY not configured');
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