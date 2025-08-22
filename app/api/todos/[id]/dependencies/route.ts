// app/api/todos/[id]/dependencies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dependencyService } from '@/lib/services';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        const dependencies = await dependencyService.getDependencies(todoId);
        return NextResponse.json(dependencies);
    } catch (error: any) {
        console.error('Error fetching dependencies:', error);

        if (error.message === 'Invalid todo ID') {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        const { dependsOnId } = await request.json();

        const dependency = await dependencyService.addDependency(todoId, dependsOnId);
        return NextResponse.json(dependency, { status: 201 });
    } catch (error: any) {
        console.error('Error creating dependency:', error);

        const statusCode = error.statusCode || 500;

        if (error.cycle) {
            return NextResponse.json(
                {
                    error: 'Circular dependency detected',
                    cycle: error.cycle,
                    message: `Adding this dependency would create a cycle: ${error.cycle.join(' → ')}`
                },
                { status: statusCode }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: statusCode }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        const { searchParams } = new URL(request.url);
        const dependsOnId = parseInt(searchParams.get('dependsOnId') || '');

        await dependencyService.removeDependency(todoId, dependsOnId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting dependency:', error);

        const statusCode = error.statusCode || 500;
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: statusCode }
        );
    }
}