'use client'

import { Suspense, lazy, useState, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

// Lazy load the heavy 3D component
const EarthCanvas = lazy(() => import('./EarthCanvas').then(module => ({
  default: module.EarthCanvas || module.default
})))

// Lightweight fallback component
const EarthFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-white/80 text-sm">Loading Earth...</p>
    </div>
  </div>
)

// Error fallback with static Earth
const EarthError = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg">
    <svg viewBox="0 0 200 200" className="w-32 h-32">
      <circle cx="100" cy="100" r="80" fill="#4F46E5" opacity="0.8"/>
      <circle cx="100" cy="100" r="60" fill="#3B82F6" opacity="0.6"/>
      <circle cx="100" cy="100" r="40" fill="#06B6D4" opacity="0.4"/>
      <text x="100" y="105" textAnchor="middle" fill="white" fontSize="12">Earth</text>
    </svg>
  </div>
)

export default function DelayedEarthCanvas() {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          // Delay loading to improve initial page load
          const timer = setTimeout(() => setShouldLoad(true), 500)
          return () => clearTimeout(timer)
        }
      },
      { threshold: 0.1 }
    )

    const element = document.getElementById('earth-container')
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div id="earth-container" className="w-full h-full">
      <ErrorBoundary fallback={<EarthError />}>
        {shouldLoad ? (
          <Suspense fallback={<EarthFallback />}>
            <EarthCanvas />
          </Suspense>
        ) : (
          <EarthFallback />
        )}
      </ErrorBoundary>
    </div>
  )
}
