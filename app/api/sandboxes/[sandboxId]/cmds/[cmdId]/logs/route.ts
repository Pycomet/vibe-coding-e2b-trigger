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
  const logParams = await params
  const encoder = new TextEncoder()
  
  try {
    const sandbox = await Sandbox.connect(logParams.sandboxId, {
      apiKey: process.env.E2B_API_KEY!,
    })

    // Connect to the running command by PID
    const pid = parseInt(logParams.cmdId)
    
    if (isNaN(pid)) {
      // If cmdId is not a valid PID (e.g., "completed"), return empty stream
      return new NextResponse(
        new ReadableStream({
          start(controller) {
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'application/x-ndjson' } }
      )
    }

    let cmdHandle
    try {
      cmdHandle = await sandbox.commands.connect(pid)
    } catch (connectError: any) {
      // If command not found or already completed, try to read any available output
      // Some commands might have completed but we can still try to get their output
      const errorMessage = connectError?.message || String(connectError)
      console.log(`Could not connect to command PID ${pid}: ${errorMessage}`)
      
      // For completed commands, the process might be gone but we should still
      // return an empty stream rather than failing silently
      // The UI will handle commands with no logs gracefully
      return new NextResponse(
        new ReadableStream({
          start(controller) {
            // Return empty stream for completed commands
            // This allows the UI to show the command even if logs aren't available
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'application/x-ndjson' } }
      )
    }

    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          try {
            console.log(`Starting log stream for PID ${pid}`)
            
            // Send initial output if available
            if (cmdHandle.stdout) {
              console.log(`Sending stdout: ${cmdHandle.stdout.substring(0, 100)}`)
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    data: cmdHandle.stdout,
                    stream: 'stdout',
                    timestamp: Date.now(),
                  }) + '\n'
                )
              )
            }
            
            if (cmdHandle.stderr) {
              console.log(`Sending stderr: ${cmdHandle.stderr.substring(0, 100)}`)
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    data: cmdHandle.stderr,
                    stream: 'stderr',
                    timestamp: Date.now(),
                  }) + '\n'
                )
              )
            }

            // Wait for command to complete and send any new output
            try {
              await cmdHandle.wait()
              
              // Send any additional output after completion
              const finalStdout = cmdHandle.stdout
              const finalStderr = cmdHandle.stderr
              
              // Only send if there's new content
              if (finalStdout) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      data: finalStdout,
                      stream: 'stdout',
                      timestamp: Date.now(),
                    }) + '\n'
                  )
                )
              }
              
              if (finalStderr) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      data: finalStderr,
                      stream: 'stderr',
                      timestamp: Date.now(),
                    }) + '\n'
                  )
                )
              }
            } catch (waitError: any) {
              // Command might have exited with non-zero code, that's ok
              console.log(`Command wait error (expected for non-zero exit):`, waitError?.message)
            }

            console.log(`Log stream complete for PID ${pid}`)
            controller.close()
          } catch (error) {
            console.error('Error streaming logs:', error)
            controller.close()
          }
        },
      }),
      { headers: { 'Content-Type': 'application/x-ndjson' } }
    )
  } catch (error) {
    console.error('Error getting logs:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to get logs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
