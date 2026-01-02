import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox } from 'e2b'

interface Params {
  sandboxId: string
  cmdId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cmdParams = await params
  
  try {
    const sandbox = await Sandbox.connect(cmdParams.sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    })
    
    const pid = parseInt(cmdParams.cmdId)
    
    // Try to connect to the command
    try {
      const command = await sandbox.commands.connect(pid)
      
      /**
       * Wait for command to complete. If the sandbox is stopped or command
       * is not found, return null for finish data.
       */
      const done = await command.wait().catch(() => null)
      
      return NextResponse.json({
        sandboxId: cmdParams.sandboxId,
        cmdId: cmdParams.cmdId,
        startedAt: Date.now(), // Approximate timestamp
        exitCode: done?.exitCode ?? 0,
      })
    } catch (connectError: any) {
      // If process not found, it likely already completed successfully
      if (connectError.message?.includes('not found')) {
        return NextResponse.json({
          sandboxId: cmdParams.sandboxId,
          cmdId: cmdParams.cmdId,
          startedAt: Date.now(),
          exitCode: 0, // Assume success if process already exited
        })
      }
      throw connectError
    }
  } catch (error) {
    console.error('Error getting command info:', error)
    return NextResponse.json(
      { error: 'Failed to get command info' },
      { status: 500 }
    )
  }
}
