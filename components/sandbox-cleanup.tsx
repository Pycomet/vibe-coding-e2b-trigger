'use client'

import { useSandboxStore } from '@/app/state'
import { useEffect, useRef } from 'react'

/**
 * Component that handles sandbox cleanup when the user closes the browser tab.
 * Now less aggressive - doesn't kill sandbox on page refresh.
 */
export function SandboxCleanup() {
  const { sandboxId } = useSandboxStore()
  const isRefreshRef = useRef(false)

  useEffect(() => {
    if (!sandboxId) return

    const cleanup = async () => {
      try {
        // Use sendBeacon for reliability during page unload
        const url = `/api/sandboxes/${sandboxId}/kill`
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } catch (error) {
        console.error('Failed to cleanup sandbox:', error)
      }
    }

    // Detect if this is a refresh vs actual close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if user is refreshing (Ctrl+R, F5, etc) vs closing tab
      // Navigation events within the app don't trigger beforeunload
      
      // If navigation type indicates reload, don't cleanup
      if (performance.getEntriesByType('navigation').length > 0) {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navEntry.type === 'reload') {
          isRefreshRef.current = true
          return // Don't cleanup on refresh
        }
      }
      
      // Only cleanup on actual tab/window close
      if (!isRefreshRef.current) {
        cleanup()
      }
    }

    // Use pagehide as fallback - more reliable for mobile
    const handlePageHide = (e: PageTransitionEvent) => {
      // Only cleanup if page is being permanently unloaded (not cached)
      if (!e.persisted && !isRefreshRef.current) {
        cleanup()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [sandboxId])

  return null
}

