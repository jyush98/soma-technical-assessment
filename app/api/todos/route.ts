// app/api/todos/route.ts
import { NextResponse } from 'next/server';
import { todoService } from '@/lib/services';
import { prisma } from '@/lib/prisma';
import { pexelsService } from '@/lib/pexels';

export async function GET() {
  try {
    const todos = await todoService.getAllTodos();
    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (body.estimatedDays && (body.estimatedDays < 1 || body.estimatedDays > 365)) {
      return NextResponse.json({ error: 'Estimated days must be between 1 and 365' }, { status: 400 });
    }

    const result = await todoService.createTodo(body);

    // Trigger image generation asynchronously after creation
    if (result.newTodo) {
      generateImageForTodo(result.newTodo, body.title);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Invalid due date format') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}

// Use your existing PexelsService
async function generateImageForTodo(todoId: number, title: string) {
  try {
    // Use your existing service instead of raw fetch
    const photo = await pexelsService.searchImage(title);

    if (photo) {
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
    }).catch(() => { });
  }
}