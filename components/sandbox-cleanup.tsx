'use client'

import { useSandboxStore } from '@/app/state'
import { useEffect } from 'react'

/**
 * Component that handles sandbox cleanup when the user closes the browser tab
 * or navigates away from the page.
 */
export function SandboxCleanup() {
  const { sandboxId } = useSandboxStore()

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

    // Handle page unload (tab close, browser close, navigation)
    const handleBeforeUnload = () => {
      cleanup()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sandboxId])

  return null
}

