import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { tool } from 'ai'
import description from './get-sandbox-url.md'
import z from 'zod/v3'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { getSandboxURLTask } from '@/trigger/get-sandbox-url'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export const getSandboxURL = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe(
          "The unique identifier of the sandbox (e.g., 'sbx_abc123xyz'). This ID is returned when creating a sandbox and is used to reference the specific sandbox instance."
        ),
      port: z
        .number()
        .describe(
          'The port number where a service is running inside the sandbox (e.g., 3000 for Next.js dev server, 8000 for Python apps, 5000 for Flask). The port must have been exposed when the sandbox was created or when running commands.'
        ),
    }),
    execute: async ({ sandboxId, port }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-get-sandbox-url',
        data: { status: 'loading' },
      })

      try {
        // Trigger the Trigger.dev task
        const handle = await tasks.trigger<typeof getSandboxURLTask>(
          'get-sandbox-url',
          { sandboxId, port }
        )

        // Subscribe to real-time updates
        for await (const run of runs.subscribeToRun(handle.id)) {
          if (run.status === 'COMPLETED' && run.output) {
            const output = run.output as { url: string; status: string }

            writer.write({
              id: toolCallId,
              type: 'data-get-sandbox-url',
              data: { url: output.url, status: 'done' },
            })

            return { url: output.url }
          }

          if (run.status === 'FAILED' || run.status === 'CRASHED' || run.status === 'SYSTEM_FAILURE') {
            const errorMsg = typeof run.error === 'string' ? run.error : 'Failed to get sandbox URL'
            throw new Error(errorMsg)
          }
        }

        throw new Error('Task completed without output')
      } catch (error) {
        writer.write({
          id: toolCallId,
          type: 'data-get-sandbox-url',
          data: { status: 'error' },
        })

        throw error
      }
    },
  })
