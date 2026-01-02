import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import description from './create-sandbox.md'
import z from 'zod/v3'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { createSandboxTask } from '@/trigger/create-sandbox'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export const createSandbox = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      timeout: z
        .number()
        .min(600000)
        .max(7200000)
        .optional()
        .describe(
          'Maximum time in milliseconds the sandbox will remain active before automatically shutting down. Minimum 600000ms (10 minutes), maximum 7200000ms (2 hours). Defaults to 3600000ms (60 minutes). The sandbox will terminate all running processes when this timeout is reached.'
        ),
      ports: z
        .array(z.number())
        .max(2)
        .optional()
        .describe(
          'Array of network ports to expose and make accessible from outside the sandbox. These ports allow web servers, APIs, or other services running inside the sandbox to be reached externally. Common ports include 3000 (Next.js), 8000 (Python servers), 5000 (Flask), etc.'
        ),
    }),
    execute: async ({ timeout, ports }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-create-sandbox',
        data: { status: 'loading' },
      })

      try {
        // Trigger the Trigger.dev task
        const handle = await tasks.trigger<typeof createSandboxTask>(
          'create-sandbox',
          { timeout, ports }
        )

        // Subscribe to real-time updates
        for await (const run of runs.subscribeToRun(handle.id)) {
          if (run.status === 'COMPLETED' && run.output) {
            const output = run.output as { sandboxId: string; status: string }
            
            writer.write({
              id: toolCallId,
              type: 'data-create-sandbox',
              data: { sandboxId: output.sandboxId, status: 'done' },
            })

            return (
              `Sandbox created with ID: ${output.sandboxId}.` +
              `\nYou can now upload files, run commands, and access services on the exposed ports.`
            )
          }

          if (run.status === 'FAILED' || run.status === 'CRASHED' || run.status === 'SYSTEM_FAILURE') {
            const errorMsg = typeof run.error === 'string' ? run.error : 'Failed to create sandbox'
            throw new Error(errorMsg)
          }
        }

        throw new Error('Task completed without output')
      } catch (error) {
        const richError = getRichError({
          action: 'Creating Sandbox',
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-create-sandbox',
          data: {
            error: { message: richError.error.message },
            status: 'error',
          },
        })

        console.log('Error creating Sandbox:', richError.error)
        return richError.message
      }
    },
  })
