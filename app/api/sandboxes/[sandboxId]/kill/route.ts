import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> }
) {
  const { sandboxId } = await params

  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    })

    await sandbox.kill()

    return NextResponse.json({ 
      success: true,
      message: 'Sandbox killed successfully' 
    })
  } catch (error) {
    console.error('Error killing sandbox:', error)
    // Don't return error if sandbox is already dead
    return NextResponse.json({ 
      success: true,
      message: 'Sandbox already stopped or not found' 
    })
  }
}

