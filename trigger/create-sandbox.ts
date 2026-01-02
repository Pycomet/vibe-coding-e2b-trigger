import { task, logger } from "@trigger.dev/sdk/v3";
import { Sandbox } from "e2b";
import type { CreateSandboxInput, CreateSandboxOutput } from "./types";

export const createSandboxTask = task({
  id: "create-sandbox",
  run: async (payload: CreateSandboxInput): Promise<CreateSandboxOutput> => {
    try {
      logger.info("Creating e2b sandbox", { payload });

      const sandbox = await Sandbox.create({
        apiKey: process.env.E2B_API_KEY!,
        timeoutMs: payload.timeout ?? 1800000, // Default 30 minutes (auto-cleanup)
      });

      logger.info("Sandbox created successfully", { 
        sandboxId: sandbox.sandboxId 
      });

      // Install pnpm for faster package management
      logger.info("Installing pnpm");
      try {
        await sandbox.commands.run("npm install -g pnpm@latest");
        logger.info("pnpm installed successfully");
      } catch (pnpmError) {
        logger.warn("Failed to install pnpm, will fallback to npm", { error: pnpmError });
      }

      return {
        sandboxId: sandbox.sandboxId,
        status: "done",
      };
    } catch (error) {
      logger.error("Failed to create sandbox", { error });
      throw error;
    }
  },
});

