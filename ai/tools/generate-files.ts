import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { getContents, type File } from './generate-files/get-contents'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import description from './generate-files.md'
import z from 'zod/v3'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { generateFilesTask } from '@/trigger/generate-files'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

export const generateFiles = ({ writer, modelId }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      writer.write({
        id: toolCallId,
        type: 'data-generating-files',
        data: { paths: [], status: 'generating' },
      })

      const iterator = getContents({ messages, modelId, paths })
      const generated: File[] = []

      try {
        // First, generate all file contents
        for await (const chunk of iterator) {
          if (chunk.files.length > 0) {
            generated.push(...chunk.files)
          } else {
            writer.write({
              id: toolCallId,
              type: 'data-generating-files',
              data: {
                status: 'generating',
                paths: chunk.paths,
              },
            })
          }
        }

        // Trigger task to write files to sandbox
        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: {
            status: 'uploading',
            paths: generated.map((f) => f.path),
          },
        })

        const handle = await tasks.trigger<typeof generateFilesTask>(
          'generate-files',
          {
            sandboxId,
            files: generated.map((f) => ({ path: f.path, content: f.content })),
          }
        )

        // Subscribe to real-time updates
        for await (const run of runs.subscribeToRun(handle.id)) {
          if (run.status === 'COMPLETED' && run.output) {
            const output = run.output as { paths: string[]; status: string }

            writer.write({
              id: toolCallId,
              type: 'data-generating-files',
              data: { paths: output.paths, status: 'uploaded' },
            })

            return `Successfully generated and uploaded ${
              generated.length
            } files. Their paths and contents are as follows:
        ${generated
          .map((file) => `Path: ${file.path}\nContent: ${file.content}\n`)
          .join('\n')}`
          }

          if (run.status === 'FAILED' || run.status === 'CRASHED' || run.status === 'SYSTEM_FAILURE') {
            const errorMsg = typeof run.error === 'string' ? run.error : 'Failed to generate files'
            throw new Error(errorMsg)
          }
        }

        throw new Error('Task completed without output')
      } catch (error) {
        const richError = getRichError({
          action: 'generate file contents',
          args: { modelId, paths },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-generating-files',
          data: {
            error: richError.error,
            status: 'error',
            paths,
          },
        })

        return richError.message
      }
    },
  })
