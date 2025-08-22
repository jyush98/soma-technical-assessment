// app/api/todos/route.ts
import { NextResponse } from 'next/server';
import { todoService } from '@/lib/services';

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
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Invalid due date format') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}