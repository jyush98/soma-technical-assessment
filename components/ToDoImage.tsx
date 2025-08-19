// components/TodoImage.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TodoImageProps {
    todoId: number;
    todoTitle: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
    isLoading?: boolean;
    onImageLoad?: (imageData: { imageUrl: string; imageAlt: string }) => void;
}

export default function TodoImage({
    todoId,
    todoTitle,
    imageUrl,
    imageAlt,
    isLoading = false,
    onImageLoad
}: TodoImageProps) {
    const [loading, setLoading] = useState(isLoading);
    const [error, setError] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [currentImageAlt, setCurrentImageAlt] = useState(imageAlt);

    // Auto-fetch image when component mounts
    useEffect(() => {
        if (!currentImageUrl && !loading && !error) {
            fetchImage();
        }
    }, [todoId]);

    const fetchImage = async () => {
        if (loading) return;

        setLoading(true);
        setError(false);

        try {
            const response = await fetch(`/api/todos/${todoId}/image`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentImageUrl(data.imageUrl);
                setCurrentImageAlt(data.imageAlt);

                // Notify parent component about the image load
                onImageLoad?.({
                    imageUrl: data.imageUrl,
                    imageAlt: data.imageAlt
                });
            } else {
                setError(true);
            }
        } catch (err) {
            console.error('Error fetching image:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
                    <span className="text-sm font-medium">Finding image...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !currentImageUrl) {
        return (
            <div className="w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-center text-gray-400">
                    <div className="text-2xl mb-1">🖼️</div>
                    <div className="text-sm font-medium mb-1">No image available</div>
                    {error && (
                        <button
                            onClick={fetchImage}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Success state - display image
    return (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <Image
                src={currentImageUrl}
                alt={currentImageAlt || `Image for ${todoTitle}`}
                fill
                className="object-cover transition-opacity duration-200"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={() => setError(true)}
                onLoad={() => {
                    // Subtle fade-in effect when image loads
                    const img = document.querySelector(`img[src="${currentImageUrl}"]`) as HTMLImageElement;
                    if (img) {
                        img.style.opacity = '1';
                    }
                }}
            />
        </div>
    );
}