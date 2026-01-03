import { task, logger } from "@trigger.dev/sdk/v3";
import { Sandbox } from "e2b";
import type { RunCommandInput, RunCommandOutput } from "./types";

export const runCommandTask = task({
  id: "run-command",
  run: async (payload: RunCommandInput): Promise<RunCommandOutput> => {
    let sandbox: Sandbox | null = null;

    try {
      logger.info("Connecting to sandbox", { sandboxId: payload.sandboxId });

      sandbox = await Sandbox.connect(payload.sandboxId, {
        apiKey: process.env.E2B_API_KEY!,
      });

      logger.info("Running command", { 
        command: payload.command, 
        args: payload.args 
      });

      // Build the full command string
      const fullCommand = payload.sudo 
        ? `sudo ${payload.command} ${(payload.args || []).join(' ')}`
        : `${payload.command} ${(payload.args || []).join(' ')}`;

      // Always run commands in background to enable real-time streaming
      const cmdHandle = await sandbox.commands.run(fullCommand, { background: true });
      const commandId = cmdHandle.pid.toString();
      
      logger.info("Command started", { commandId, wait: payload.wait });

      if (!payload.wait) {
        // Return immediately for background commands
        return {
          commandId,
          status: "running",
        };
      }

      // For blocking commands, wait for completion and capture output
      logger.info("Waiting for command to complete");
      
      try {
        const result = await cmdHandle.wait();
        const exitCode = result.exitCode;

        // Capture stdout and stderr from the command handle
        // These are available as strings after the command completes
        const stdout = cmdHandle.stdout || "";
        const stderr = cmdHandle.stderr || "";

        logger.info("Command completed", { 
          commandId, 
          exitCode,
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
        });

        return {
          commandId,
          exitCode,
          stdout,
          stderr,
          status: "done",
        };
      } catch (cmdError: any) {
        // Command failed but we still want to return the error info
        // Capture any available output even on error
        const stdout = cmdHandle.stdout || "";
        const stderr = cmdHandle.stderr || "";
        
        logger.warn("Command failed with error", { error: cmdError });
        
        return {
          commandId,
          exitCode: cmdError.exitCode || 1,
          stdout,
          stderr,
          status: "done",
        };
      }
    } catch (error) {
      logger.error("Failed to connect to sandbox or run command", { error });
      throw error;
    } finally {
      // e2b sandboxes don't need explicit closing when using connect
      // The sandbox continues running for other operations
    }
  },
});

