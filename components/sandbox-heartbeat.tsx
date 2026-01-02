'use client'

import { useSandboxStore } from '@/app/state'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

/**
 * Component that maintains a heartbeat connection to the sandbox
 * to detect if it's still alive and responsive.
 */
export function SandboxHeartbeat() {
  const { sandboxId, setStatus } = useSandboxStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const failedAttemptsRef = useRef(0)

  useEffect(() => {
    if (!sandboxId) return

    // Ping every 2 minutes to keep sandbox alive and detect disconnections
    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/sandboxes/${sandboxId}/heartbeat`)
        const data = await response.json()
        
        if (data.status === 'dead' || !response.ok) {
          failedAttemptsRef.current += 1
          
          // Only show error after 2 consecutive failures to avoid false positives
          if (failedAttemptsRef.current >= 2) {
            setStatus('stopped')
            toast.error('Sandbox connection lost', {
              description: 'The sandbox has stopped responding. Please create a new one.',
              duration: 10000,
            })
            
            // Stop checking after confirmed failure
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
          }
        } else {
          // Reset failed attempts on successful heartbeat
          failedAttemptsRef.current = 0
        }
      } catch (error) {
        failedAttemptsRef.current += 1
        console.error('Heartbeat check failed:', error)
        
        // Show error after 2 consecutive failures
        if (failedAttemptsRef.current >= 2) {
          setStatus('stopped')
          toast.error('Sandbox connection lost', {
            description: 'Unable to reach the sandbox. It may have timed out.',
            duration: 10000,
          })
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
        }
      }
    }, 120000) // Every 2 minutes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [sandboxId, setStatus])

  return null
}

