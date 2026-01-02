'use client'

import { useSandboxStore } from '@/app/state'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Power, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function SandboxControls() {
  const { sandboxId, status } = useSandboxStore()
  const [isKilling, setIsKilling] = useState(false)

  if (!sandboxId || status === 'stopped') {
    return null
  }

  const handleKillSandbox = async () => {
    if (!sandboxId) return

    try {
      setIsKilling(true)
      const response = await fetch(`/api/sandboxes/${sandboxId}/kill`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Sandbox terminated successfully')
        // Reload to start fresh
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('Failed to terminate sandbox')
      }
    } catch (error) {
      console.error('Error killing sandbox:', error)
      toast.error('Failed to terminate sandbox')
    } finally {
      setIsKilling(false)
    }
  }

  const handleRestartSandbox = async () => {
    if (!sandboxId) return

    try {
      setIsKilling(true)
      const response = await fetch(`/api/sandboxes/${sandboxId}/kill`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Restarting sandbox...')
        // Reload to create new sandbox
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.error('Failed to restart sandbox')
      }
    } catch (error) {
      console.error('Error restarting sandbox:', error)
      toast.error('Failed to restart sandbox')
    } finally {
      setIsKilling(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={isKilling}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Sandbox controls</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Sandbox: {sandboxId.slice(0, 8)}...
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleRestartSandbox}
          disabled={isKilling}
          className="cursor-pointer"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restart Sandbox
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleKillSandbox}
          disabled={isKilling}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Power className="mr-2 h-4 w-4" />
          Stop Sandbox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

