import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params

  try {
    // Simple connection test - if this succeeds, sandbox is alive
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    })
    
    // Run a lightweight command to verify it's responsive
    await sandbox.commands.run('echo "heartbeat"', { background: false })

    return NextResponse.json({ 
      status: 'alive',
      sandboxId,
      timestamp: Date.now()
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'dead',
      sandboxId,
      error: String(error)
    }, { status: 503 })
  }
}

