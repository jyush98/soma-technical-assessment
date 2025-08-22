// app/api/todos/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pexelsService } from '@/lib/pexels';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const todoId = parseInt(params.id);
        if (isNaN(todoId)) {
            return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
        }

        // Get the todo to search for image
        const todo = await prisma.todo.findUnique({
            where: { id: todoId }
        });

        if (!todo) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
        }

        // Check if we already have an image for this exact title
        // This avoids re-searching when user hasn't changed the todo
        if (todo.imageUrl && todo.lastImageSearch === todo.title) {
            return NextResponse.json({
                imageUrl: todo.imageUrl,
                imageAlt: todo.imageAlt,
                cached: true
            });
        }

        // Set loading state in database
        await prisma.todo.update({
            where: { id: todoId },
            data: { imageLoading: true }
        });

        // Search for image using the todo title
        const image = await pexelsService.searchImage(todo.title);

        if (image) {
            // Success! Update todo with image data
            const updatedTodo = await prisma.todo.update({
                where: { id: todoId },
                data: {
                    imageUrl: image.src.medium, // Good balance of quality vs size
                    imageAlt: image.alt || `Image for ${todo.title}`,
                    imageLoading: false,
                    lastImageSearch: todo.title // Cache key for future checks
                }
            });

            return NextResponse.json({
                imageUrl: updatedTodo.imageUrl,
                imageAlt: updatedTodo.imageAlt,
                photographer: image.photographer,
                photographerUrl: image.photographer_url
            });
        } else {
            // No image found or API error - reset loading state
            await prisma.todo.update({
                where: { id: todoId },
                data: {
                    imageLoading: false,
                    lastImageSearch: todo.title // Still cache that we tried
                }
            });

            return NextResponse.json({
                error: 'No suitable image found',
                fallback: true
            }, { status: 404 });
        }

    } catch (error) {
        console.error('Error in image API:', error);

        // Always reset loading state on error to prevent UI getting stuck
        try {
            await prisma.todo.update({
                where: { id: parseInt(params.id) },
                data: { imageLoading: false }
            });
        } catch (dbError) {
            console.error('Error resetting loading state:', dbError);
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}