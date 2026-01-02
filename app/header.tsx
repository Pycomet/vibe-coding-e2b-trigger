import { SandboxControls } from '@/components/sandbox-controls'
import { ToggleWelcome } from '@/components/modals/welcome'
import { VercelDashed } from '@/components/icons/vercel-dashed'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export async function Header({ className }: Props) {
  return (
    <header className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center">
        <VercelDashed className="ml-1 md:ml-2.5 mr-1.5" />
        <span className="hidden md:inline text-sm uppercase font-mono font-bold tracking-tight">
          OSS Vibe Coding Platform
        </span>
        <p className="ml-4 text-xs text-muted-foreground">Custom execution layer with Trigger.dev and e2b by <a href="https://codefred.dev" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">CodeFred</a></p>
      </div>
      <div className="flex items-center ml-auto space-x-1.5">
        <SandboxControls />
        <ToggleWelcome />
      </div>
    </header>
  )
}
