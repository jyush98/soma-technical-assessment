// lib/__tests__/pexels.test.ts
import { pexelsService } from "@/lib/pexels";

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock environment variable
const originalEnv = process.env;

describe('PexelsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set up clean environment for each test
        process.env = {
            ...originalEnv,
            PEXELS_API_KEY: 'test-api-key'
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('searchImage', () => {
        it('should return image data for successful search', async () => {
            // Arrange: Mock successful Pexels API response
            const mockPexelsResponse = {
                page: 1,
                per_page: 3,
                photos: [
                    {
                        id: 12345,
                        width: 800,
                        height: 600,
                        url: 'https://pexels.com/photo/12345',
                        photographer: 'John Doe',
                        photographer_url: 'https://pexels.com/@johndoe',
                        photographer_id: 123,
                        avg_color: '#4A4A4A',
                        src: {
                            original: 'https://images.pexels.com/photos/12345/original.jpg',
                            large2x: 'https://images.pexels.com/photos/12345/large2x.jpg',
                            large: 'https://images.pexels.com/photos/12345/large.jpg',
                            medium: 'https://images.pexels.com/photos/12345/medium.jpg',
                            small: 'https://images.pexels.com/photos/12345/small.jpg',
                            portrait: 'https://images.pexels.com/photos/12345/portrait.jpg',
                            landscape: 'https://images.pexels.com/photos/12345/landscape.jpg',
                            tiny: 'https://images.pexels.com/photos/12345/tiny.jpg'
                        },
                        alt: 'Beautiful landscape photo'
                    }
                ],
                total_results: 100
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockPexelsResponse,
            } as Response);

            // Act
            const result = await pexelsService.searchImage('beautiful landscape');

            // Assert
            expect(result).toBeDefined();
            expect(result?.id).toBe(12345);
            expect(result?.src.medium).toBe('https://images.pexels.com/photos/12345/medium.jpg');
            expect(result?.alt).toBe('Beautiful landscape photo');

            // Verify API call was made correctly
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('https://api.pexels.com/v1/search'),
                expect.objectContaining({
                    headers: {
                        'Authorization': 'test-api-key'
                    }
                })
            );
        });

        it('should return null when no photos found', async () => {
            // Arrange: Mock empty response
            const mockEmptyResponse = {
                page: 1,
                per_page: 3,
                photos: [],
                total_results: 0
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockEmptyResponse,
            } as Response);

            // Act
            const result = await pexelsService.searchImage('nonexistent query');

            // Assert
            expect(result).toBeNull();
        });

        it('should handle rate limiting gracefully', async () => {
            // Arrange: Mock rate limit response (429)
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
            } as Response);

            // Act
            const result = await pexelsService.searchImage('test query');

            // Assert
            expect(result).toBeNull();
            // Should log warning but not throw error
        });

        it('should handle network errors gracefully', async () => {
            // Arrange: Mock network error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Act
            const result = await pexelsService.searchImage('test query');

            // Assert
            expect(result).toBeNull();
            // Should handle error gracefully, not crash
        });

        it('should cache results to avoid duplicate API calls', async () => {
            // Arrange: Mock successful response
            const mockResponse = {
                page: 1,
                per_page: 3,
                photos: [{
                    id: 12345,
                    src: { medium: 'https://example.com/image.jpg' },
                    alt: 'Test image',
                    photographer: 'Test',
                    photographer_url: 'https://test.com',
                    photographer_id: 1,
                    width: 800,
                    height: 600,
                    url: 'https://test.com',
                    avg_color: '#000'
                }],
                total_results: 1
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            // Act: Search twice with same query
            const result1 = await pexelsService.searchImage('test query');
            const result2 = await pexelsService.searchImage('test query');

            // Assert: API should only be called once due to caching
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });

        it('should optimize queries for better visual results', async () => {
            // Test that common task prefixes are removed
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ photos: [], total_results: 0 }),
            } as Response);

            await pexelsService.searchImage('buy groceries');

            // Should search for optimized query, not the original
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('grocery%20shopping%20supermarket'),
                expect.any(Object)
            );
        });

        it('should handle missing API key', () => {
            // Arrange: Remove API key
            delete process.env.PEXELS_API_KEY;

            // Act & Assert: Should throw error when service is instantiated
            expect(() => {
                // Force re-instantiation by accessing private constructor logic
                new (pexelsService.constructor as any)();
            }).toThrow('PEXELS_API_KEY environment variable is required');
        });
    });
});