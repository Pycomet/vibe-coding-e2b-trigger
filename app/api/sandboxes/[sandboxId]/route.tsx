import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'

/**
 * Check if an e2b sandbox is running by attempting to connect to it
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    })
    
    // If we can connect, the sandbox is running
    const isRunning = await sandbox.isRunning()
    return NextResponse.json({ status: isRunning ? 'running' : 'stopped' })
  } catch (error) {
    // If connection fails, assume sandbox is stopped
    return NextResponse.json({ status: 'stopped' })
  }
}
