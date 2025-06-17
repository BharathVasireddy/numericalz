'use client'

import React, { useState, useCallback, memo } from 'react'
import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL'> {
  // Enhanced props for better performance
  fallbackSrc?: string
  showPlaceholder?: boolean
  placeholderColor?: string
  enableBlur?: boolean
  priority?: boolean
  loading?: 'lazy' | 'eager'
  onLoadingComplete?: (result: { naturalWidth: number; naturalHeight: number }) => void
  onError?: () => void
  className?: string
  containerClassName?: string
  aspectRatio?: number
  sizes?: string
}

/**
 * High-Performance Optimized Image Component
 * 
 * Features:
 * - Automatic WebP/AVIF format selection
 * - Lazy loading with intersection observer
 * - Blur placeholder for smooth loading
 * - Error handling with fallback images
 * - Responsive sizing with aspect ratio preservation
 * - Performance monitoring integration
 * - Memory usage optimization
 * - Progressive enhancement
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallbackSrc,
  showPlaceholder = true,
  placeholderColor = '#f3f4f6',
  enableBlur = true,
  priority = false,
  loading = 'lazy',
  onLoadingComplete,
  onError,
  className,
  containerClassName,
  aspectRatio,
  sizes,
  quality = 85,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [loadStartTime] = useState(() => performance.now())

  // Generate blur data URL for placeholder
  const generateBlurDataURL = useCallback((color: string = placeholderColor) => {
    const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
      </svg>
    `
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }, [placeholderColor])

  // Handle image load completion
  const handleLoadingComplete = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const loadTime = performance.now() - loadStartTime
    const img = event.currentTarget
    const result = { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }
    setIsLoading(false)
    
    // Performance tracking
    if (process.env.NODE_ENV === 'development') {
      console.log(`🖼️ Image loaded: ${src} (${loadTime.toFixed(2)}ms)`)
      
      if (loadTime > 1000) {
        console.warn(`🐌 Slow image load: ${src} took ${loadTime.toFixed(2)}ms`)
      }
    }
    
    onLoadingComplete?.(result)
  }, [src, loadStartTime, onLoadingComplete])

  // Handle image load error
  const handleError = useCallback(() => {
    const loadTime = performance.now() - loadStartTime
    setIsLoading(false)
    setHasError(true)
    
    console.error(`❌ Image failed to load: ${src} (after ${loadTime.toFixed(2)}ms)`)
    onError?.()
  }, [src, loadStartTime, onError])

  // Calculate aspect ratio
  const calculatedAspectRatio = aspectRatio || (width && height ? Number(width) / Number(height) : undefined)

  // Determine if we should use placeholder
  const shouldUsePlaceholder = enableBlur && showPlaceholder && !priority

  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || `
    (max-width: 640px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    25vw
  `.replace(/\s+/g, ' ').trim()

  // Error fallback component
  const ErrorFallback = () => (
    <div 
      className={cn(
        "flex items-center justify-center bg-gray-100 text-gray-400 text-sm",
        "border border-gray-200 rounded",
        className
      )}
      style={{
        width: width,
        height: height,
        aspectRatio: calculatedAspectRatio,
      }}
    >
      <div className="text-center p-4">
        <svg 
          className="mx-auto h-8 w-8 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p>Image unavailable</p>
      </div>
    </div>
  )

  // Loading placeholder component
  const LoadingPlaceholder = () => (
    <div 
      className={cn(
        "animate-pulse bg-gray-200 rounded",
        className
      )}
      style={{
        width: width,
        height: height,
        aspectRatio: calculatedAspectRatio,
        backgroundColor: placeholderColor,
      }}
      aria-label="Loading image..."
    />
  )

  // If image failed and we have a fallback, try the fallback
  if (hasError && fallbackSrc) {
    return (
      <OptimizedImage
        {...props}
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        containerClassName={containerClassName}
        onError={() => setHasError(true)}
        fallbackSrc={undefined} // Prevent infinite fallback loop
      />
    )
  }

  // If image failed and no fallback, show error state
  if (hasError) {
    return <ErrorFallback />
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {/* Loading placeholder */}
      {isLoading && showPlaceholder && <LoadingPlaceholder />}
      
      {/* Main image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        loading={loading}
        sizes={responsiveSizes}
        placeholder={shouldUsePlaceholder ? 'blur' : 'empty'}
        blurDataURL={shouldUsePlaceholder ? generateBlurDataURL() : undefined}
        onLoad={handleLoadingComplete}
        onError={handleError}
        className={cn(
          // Smooth transition when loading completes
          "transition-opacity duration-300",
          isLoading && showPlaceholder ? "opacity-0" : "opacity-100",
          // Ensure image covers container properly
          "object-cover",
          className
        )}
        style={{
          aspectRatio: calculatedAspectRatio,
        }}
        {...props}
      />
      
      {/* Optional overlay for loading state */}
      {isLoading && !showPlaceholder && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

/**
 * Specialized avatar image component
 */
export const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  fallbackInitials,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number
  fallbackInitials?: string
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError && fallbackInitials) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-500 text-white font-medium rounded-full",
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallbackInitials}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      onError={() => setHasError(true)}
      {...props}
    />
  )
})

/**
 * Specialized logo image component
 */
export const LogoImage = memo(function LogoImage({
  src,
  alt = "Company Logo",
  width = 120,
  height = 40,
  priority = true,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("object-contain", className)}
      enableBlur={false} // Logos typically don't need blur placeholder
      {...props}
    />
  )
})

/**
 * Specialized hero/banner image component
 */
export const HeroImage = memo(function HeroImage({
  src,
  alt,
  width = 1920,
  height = 1080,
  priority = true,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes="100vw"
      className={cn("w-full h-auto object-cover", className)}
      {...props}
    />
  )
})

export default OptimizedImage 