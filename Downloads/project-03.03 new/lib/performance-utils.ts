/**
 * Performance utilities for optimizing the SERETS.CO.IL website
 */

import * as React from 'react'
const { useEffect, useState, useCallback, useRef } = React

/**
 * Hook to lazy load images with a fade-in effect
 * @param src The image source URL
 * @param placeholder Optional placeholder image URL
 * @returns Object containing loaded state and image source
 */
export function useProgressiveImage(src: string, placeholder?: string) {
  const [sourceLoaded, setSourceLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder || '')

  useEffect(() => {
    // Reset state if src changes
    setSourceLoaded(false)
    
    // Create new image object
    const img = new Image()
    img.src = src
    img.onload = () => {
      setSourceLoaded(true)
      setCurrentSrc(src)
    }
    
    return () => {
      img.onload = null
    }
  }, [src])

  return { loaded: sourceLoaded, currentSrc }
}

/**
 * Debounce function to limit how often a function can be called
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Hook to detect if an element is in the viewport
 * @param options IntersectionObserver options
 * @returns [ref, isInView] tuple
 */
export function useInView(options = {}) {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (!ref.current) return
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting)
    }, options)
    
    observer.observe(ref.current)
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [options])
  
  return [ref, isInView]
}

/**
 * Cache data in localStorage with expiration
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in milliseconds
 */
export function setLocalCache<T>(key: string, data: T, ttl = 3600000): void {
  if (typeof window === 'undefined') return
  
  try {
    const item = {
      data,
      expiry: Date.now() + ttl
    }
    
    localStorage.setItem(`cache:${key}`, JSON.stringify(item))
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

/**
 * Get data from localStorage cache
 * @param key Cache key
 * @returns Cached data or null if expired/not found
 */
export function getLocalCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  
  try {
    const item = localStorage.getItem(`cache:${key}`)
    if (!item) return null
    
    const { data, expiry } = JSON.parse(item)
    
    if (Date.now() > expiry) {
      localStorage.removeItem(`cache:${key}`)
      return null
    }
    
    return data as T
  } catch (error) {
    console.error('Error getting cache:', error)
    return null
  }
}

/**
 * Capture and report Web Vitals metrics
 */
export function captureWebVitals(): void {
  if (typeof window !== 'undefined') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(sendToAnalytics)
      getFID(sendToAnalytics)
      getFCP(sendToAnalytics)
      getLCP(sendToAnalytics)
      getTTFB(sendToAnalytics)
    })
  }
}

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // Send to analytics endpoint or log in development
  if (process.env.NODE_ENV === 'production') {
    // Replace with your analytics endpoint
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        page: window.location.pathname
      }),
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('Failed to send metrics:', err))
  } else {
    console.log('Performance metric:', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      page: window.location.pathname
    })
  }
}

/**
 * Prefetch data for anticipated user actions
 * @param paths Array of paths to prefetch
 */
export function prefetchRoutes(paths: string[]): void {
  if (typeof window === 'undefined') return
  
  // Use requestIdleCallback for non-critical prefetching
  const prefetch = () => {
    paths.forEach(path => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = path
      document.head.appendChild(link)
    })
  }
  
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetch)
  } else {
    setTimeout(prefetch, 2000)
  }
}

/**
 * Optimize image loading with blur-up technique
 * @param Component Component to wrap with optimized image loading
 * @returns Wrapped component with optimized image loading
 */
export function withOptimizedImages(Component: React.ComponentType<any>) {
  return function OptimizedComponent(props: any) {
    useEffect(() => {
      // Add support for native lazy loading where available
      if ('loading' in HTMLImageElement.prototype) {
        const images = document.querySelectorAll('img[data-src]')
        images.forEach(img => {
          img.setAttribute('loading', 'lazy')
          img.setAttribute('src', img.getAttribute('data-src')!)
          img.removeAttribute('data-src')
        })
      } else {
        // Fallback to IntersectionObserver
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              img.src = img.dataset.src!
              img.onload = () => {
                img.classList.add('loaded')
                img.removeAttribute('data-src')
              }
              observer.unobserve(img)
            }
          })
        })
        
        document.querySelectorAll('img[data-src]').forEach(img => {
          observer.observe(img)
        })
      }
    }, [])
    
    return React.createElement(Component, props)
  }
}