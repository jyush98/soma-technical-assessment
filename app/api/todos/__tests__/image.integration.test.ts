// app/api/todos/__tests__/image.integration.test.ts
// Don't import NextRequest - create mock requests like due-dates test

// Follow the working due-dates pattern exactly
describe('Image API Route', () => {
    beforeEach(() => {
        // Reset modules before each test for clean state
        jest.resetModules();
    });

    describe('POST /api/todos/[id]/image', () => {
        it('should return existing image if already cached', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            const mockUpdate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                        update: mockUpdate,
                    },
                },
            }));

            // Arrange: Mock todo with existing image
            const mockTodo = {
                id: 1,
                title: 'Buy groceries',
                imageUrl: 'https://existing-image.jpg',
                imageAlt: 'Grocery shopping',
                lastImageSearch: 'Buy groceries',
                createdAt: new Date(),
                dueDate: null,
                imageLoading: false,
                updatedAt: new Date()
            };

            mockFindUnique.mockResolvedValue(mockTodo);

            // Create mock request - same pattern as due-dates test
            const request = {
                url: 'http://localhost:3000/api/todos/1/image'
            } as any;

            // Import and test
            const { POST } = await import('../[id]/image/route');

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                imageUrl: 'https://existing-image.jpg',
                imageAlt: 'Grocery shopping',
                cached: true
            });
        });

        it('should fetch new image when not cached', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 200,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            const mockUpdate = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                        update: mockUpdate,
                    },
                },
            }));

            // Mock Pexels service
            const mockSearchImage = jest.fn();
            jest.doMock('../../../../lib/pexels', () => ({
                pexelsService: {
                    searchImage: mockSearchImage,
                },
            }));

            // Arrange: Mock todo without image
            const mockTodo = {
                id: 1,
                title: 'Buy groceries',
                imageUrl: null,
                imageAlt: null,
                lastImageSearch: null,
                createdAt: new Date(),
                dueDate: null,
                imageLoading: false,
                updatedAt: new Date()
            };

            const mockPexelsImage = {
                id: 12345,
                src: {
                    original: 'https://new-image-original.jpg',
                    large2x: 'https://new-image-large2x.jpg',
                    large: 'https://new-image-large.jpg',
                    medium: 'https://new-image.jpg',
                    small: 'https://new-image-small.jpg',
                    portrait: 'https://new-image-portrait.jpg',
                    landscape: 'https://new-image-landscape.jpg',
                    tiny: 'https://new-image-tiny.jpg'
                },
                alt: 'Fresh groceries',
                photographer: 'John Doe',
                photographer_url: 'https://pexels.com/@johndoe',
                photographer_id: 123,
                width: 800,
                height: 600,
                url: 'https://pexels.com/photo/12345',
                avg_color: '#4A4A4A'
            };

            const mockUpdatedTodo = {
                ...mockTodo,
                imageUrl: 'https://new-image.jpg',
                imageAlt: 'Fresh groceries',
                imageLoading: false,
                lastImageSearch: 'Buy groceries'
            };

            mockFindUnique.mockResolvedValue(mockTodo);
            mockUpdate
                .mockResolvedValueOnce({ ...mockTodo, imageLoading: true })
                .mockResolvedValueOnce(mockUpdatedTodo);

            mockSearchImage.mockResolvedValue(mockPexelsImage);

            // Create mock request - same pattern as due-dates test
            const request = {
                url: 'http://localhost:3000/api/todos/1/image'
            } as any;

            // Import and test
            const { POST } = await import('../[id]/image/route');

            const response = await POST(request, { params: { id: '1' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                imageUrl: 'https://new-image.jpg',
                imageAlt: 'Fresh groceries',
                photographer: 'John Doe',
                photographerUrl: 'https://pexels.com/@johndoe'
            });

            // Verify proper sequence of database calls
            expect(mockUpdate).toHaveBeenCalledTimes(2);
        });

        it('should handle todo not found', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 404,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Mock Prisma
            const mockFindUnique = jest.fn();
            jest.doMock('../../../../lib/prisma', () => ({
                prisma: {
                    todo: {
                        findUnique: mockFindUnique,
                        update: jest.fn(),
                    },
                },
            }));

            mockFindUnique.mockResolvedValue(null);

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/999/image'
            } as any;

            // Import and test
            const { POST } = await import('../[id]/image/route');

            const response = await POST(request, { params: { id: '999' } });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data).toEqual({ error: 'Todo not found' });
        });

        it('should handle invalid todo ID', async () => {
            // Mock NextResponse
            const mockJson = jest.fn((data: any, init?: any) => ({
                status: init?.status || 400,
                async json() { return data; }
            }));

            jest.doMock('next/server', () => ({
                NextResponse: { json: mockJson }
            }));

            // Create mock request
            const request = {
                url: 'http://localhost:3000/api/todos/invalid/image'
            } as any;

            // Import and test
            const { POST } = await import('../[id]/image/route');

            const response = await POST(request, { params: { id: 'invalid' } });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data).toEqual({ error: 'Invalid todo ID' });
        });
    });
});