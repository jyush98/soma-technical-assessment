// app/api/todos/critical-path/route.ts
import { NextResponse } from 'next/server';
import { criticalPathService } from '@/lib/services';

export async function GET() {
    try {
        const result = await criticalPathService.getCriticalPath();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error calculating critical path:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        const result = await criticalPathService.recalculateAndUpdate();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error recalculating critical path:', error);

        if (error.message.includes('Circular dependency')) {
            return NextResponse.json(
                {
                    error: 'Cannot calculate critical path',
                    reason: error.message
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}