import { task, logger } from "@trigger.dev/sdk/v3";
import { Sandbox } from "e2b";
import type { GenerateFilesInput, GenerateFilesOutput } from "./types";

export const generateFilesTask = task({
  id: "generate-files",
  run: async (payload: GenerateFilesInput): Promise<GenerateFilesOutput> => {
    let sandbox: Sandbox | null = null;

    try {
      logger.info("Connecting to sandbox", { sandboxId: payload.sandboxId });

      sandbox = await Sandbox.connect(payload.sandboxId, {
        apiKey: process.env.E2B_API_KEY!,
      });

      logger.info("Generating files", { 
        fileCount: payload.files.length 
      });

      const paths: string[] = [];

      for (const file of payload.files) {
        logger.info("Writing file", { path: file.path });
        
        await sandbox.files.write(file.path, file.content);
        paths.push(file.path);
      }

      logger.info("Files generated successfully", { paths });

      return {
        paths,
        status: "done",
      };
    } catch (error) {
      logger.error("Failed to generate files", { error });
      throw error;
    } finally {
      // e2b sandboxes don't need explicit closing when using connect
      // The sandbox continues running for other operations
    }
  },
});

