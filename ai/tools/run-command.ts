import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import description from './run-command.md'
import z from 'zod/v3'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { runCommandTask } from '@/trigger/run-command'

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export const runCommand = ({ writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe('The ID of the sandbox to run the command in'),
      command: z
        .string()
        .describe(
          "The base command to run (e.g., 'npm', 'node', 'python', 'ls', 'cat'). Do NOT include arguments here. IMPORTANT: Each command runs independently in a fresh shell session - there is no persistent state between commands. You cannot use 'cd' to change directories for subsequent commands."
        ),
      args: z
        .array(z.string())
        .optional()
        .describe(
          "Array of arguments for the command. Each argument should be a separate string (e.g., ['install', '--verbose'] for npm install --verbose, or ['src/index.js'] to run a file, or ['-la', './src'] to list files). IMPORTANT: Use relative paths (e.g., 'src/file.js') or absolute paths instead of trying to change directories with 'cd' first, since each command runs in a fresh shell session."
        ),
      sudo: z
        .boolean()
        .optional()
        .describe('Whether to run the command with sudo'),
      wait: z
        .boolean()
        .describe(
          'Whether to wait for the command to finish before returning. If true, the command will block until it completes, and you will receive its output.'
        ),
    }),
    execute: async (
      { sandboxId, command, sudo, wait, args = [] },
      { toolCallId }
    ) => {
      writer.write({
        id: toolCallId,
        type: 'data-run-command',
        data: { sandboxId, command, args, status: 'executing' },
      })

      try {
        // Trigger the Trigger.dev task
        const handle = await tasks.trigger<typeof runCommandTask>(
          'run-command',
          { sandboxId, command, args, sudo, wait }
        )

        // Subscribe to real-time updates
        for await (const run of runs.subscribeToRun(handle.id)) {
          if (run.status === 'COMPLETED' && run.output) {
            const output = run.output as {
              commandId: string
              exitCode?: number
              status: string
              stdout?: string
              stderr?: string
            }

            // Create logs array from stdout/stderr for blocking commands
            const logs = []
            if (wait && output.stdout) {
              logs.push({
                data: output.stdout,
                stream: 'stdout' as const,
                timestamp: Date.now(),
              })
            }
            if (wait && output.stderr) {
              logs.push({
                data: output.stderr,
                stream: 'stderr' as const,
                timestamp: Date.now(),
              })
            }

            // Send the command with PID so UI can start streaming logs
            writer.write({
              id: toolCallId,
              type: 'data-run-command',
              data: {
                sandboxId,
                commandId: output.commandId,
                command,
                args,
                exitCode: output.exitCode,
                status: wait ? 'done' : 'running',
                logs: logs.length > 0 ? logs : undefined,
              },
            })

            if (!wait) {
              return `The command \`${command} ${args.join(
                ' '
              )}\` has been started in the background in the sandbox with ID \`${sandboxId}\` with the commandId ${
                output.commandId
              }. The output will be streamed to the logs panel in real-time.`
            }

            return `The command \`${command} ${args.join(
              ' '
            )}\` has finished with exit code ${output.exitCode}. Check the logs panel for the full output.`
          }

          if (run.status === 'FAILED' || run.status === 'CRASHED' || run.status === 'SYSTEM_FAILURE') {
            const errorMsg = typeof run.error === 'string' ? run.error : 'Failed to run command'
            throw new Error(errorMsg)
          }
        }

        throw new Error('Task completed without output')
      } catch (error) {
        const richError = getRichError({
          action: 'run command in sandbox',
          args: { sandboxId },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-run-command',
          data: {
            sandboxId,
            command,
            args,
            error: richError.error,
            status: 'error',
          },
        })

        return richError.message
      }
    },
  })
