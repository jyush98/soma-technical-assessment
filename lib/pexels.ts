// lib/pexels.ts
interface PexelsPhoto {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    alt: string;
}

interface PexelsResponse {
    page: number;
    per_page: number;
    photos: PexelsPhoto[];
    total_results: number;
    next_page?: string;
}

class PexelsService {
    private apiKey: string;
    private baseUrl = 'https://api.pexels.com/v1';
    private cache = new Map<string, PexelsPhoto>();

    constructor() {
        this.apiKey = process.env.PEXELS_API_KEY!;
        if (!this.apiKey) {
            throw new Error('PEXELS_API_KEY environment variable is required');
        }
    }

    /**
     * Search for images based on todo title
     * Returns the best matching image for task visualization
     */
    async searchImage(title: string): Promise<PexelsPhoto | null> {
        try {
            // Check cache first - avoid redundant API calls
            const cacheKey = title.toLowerCase().trim();
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey)!;
            }

            // Clean and optimize query for better visual results
            const cleanQuery = this.optimizeQuery(title);

            const response = await fetch(
                `${this.baseUrl}/search?query=${encodeURIComponent(cleanQuery)}&per_page=3&orientation=landscape`,
                {
                    headers: {
                        'Authorization': this.apiKey,
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('Pexels API rate limit reached');
                    return null;
                }
                throw new Error(`Pexels API error: ${response.status}`);
            }

            const data: PexelsResponse = await response.json();

            // Select best image (first result is usually most relevant)
            const bestImage = data.photos[0] || null;

            // Cache successful results to avoid repeated calls
            if (bestImage) {
                this.cache.set(cacheKey, bestImage);
            }

            return bestImage;
        } catch (error) {
            console.error('Error fetching image from Pexels:', error);
            return null; // Graceful degradation
        }
    }

    /**
 * Generate and save image for a todo item
 * Handles the complete flow: search, save to DB, and error handling
 */
    async generateAndSaveImage(todoId: number, title: string): Promise<void> {
        try {
            // Import prisma here to avoid circular dependencies
            const { prisma } = await import('@/lib/prisma');

            // Search for image
            const photo = await this.searchImage(title);

            if (photo) {
                // Update todo with image data
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
            console.error('Error generating image for todo:', error);
            // Always clear loading state on error
            try {
                const { prisma } = await import('@/lib/prisma');
                await prisma.todo.update({
                    where: { id: todoId },
                    data: { imageLoading: false },
                });
            } catch (dbError) {
                console.error('Error clearing loading state:', dbError);
            }
        }
    }

    /**
     * Transform todo titles into better search queries for visual content
     * This is key to getting relevant images instead of generic results
     */
    private optimizeQuery(title: string): string {
        // Remove common task prefixes that don't translate to good visuals
        let optimized = title
            .toLowerCase()
            .replace(/^(buy|get|do|make|call|email|schedule|plan|finish|complete)\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Map specific terms to more visual keywords
        const visualKeywords: Record<string, string> = {
            'grocery': 'grocery shopping supermarket',
            'groceries': 'grocery shopping supermarket',
            'meeting': 'business meeting office',
            'workout': 'fitness exercise gym',
            'exercise': 'fitness exercise gym',
            'doctor': 'medical healthcare hospital',
            'dentist': 'dental healthcare clinic',
            'vacation': 'travel destination beach',
            'trip': 'travel destination',
            'birthday': 'birthday party celebration',
            'cleaning': 'house cleaning organized',
            'laundry': 'laundry washing clothes',
            'cooking': 'cooking kitchen food',
            'study': 'studying books education',
            'work': 'office work productivity',
        };

        // Check if title contains any of our mapped terms
        for (const [key, value] of Object.entries(visualKeywords)) {
            if (optimized.includes(key)) {
                optimized = value;
                break;
            }
        }

        // Fallback to generic productivity image if we can't optimize
        return optimized || 'productivity task organization';
    }
}

// Export singleton instance for consistent caching across requests
export const pexelsService = new PexelsService();