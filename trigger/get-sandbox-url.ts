import { task, logger } from "@trigger.dev/sdk/v3";
import { Sandbox } from "e2b";
import type { GetSandboxURLInput, GetSandboxURLOutput } from "./types";

export const getSandboxURLTask = task({
  id: "get-sandbox-url",
  run: async (payload: GetSandboxURLInput): Promise<GetSandboxURLOutput> => {
    let sandbox: Sandbox | null = null;

    try {
      logger.info("Connecting to sandbox", { sandboxId: payload.sandboxId });

      sandbox = await Sandbox.connect(payload.sandboxId, {
        apiKey: process.env.E2B_API_KEY!,
      });

      logger.info("Getting sandbox URL", { port: payload.port });

      const url = `https://${sandbox.getHost(payload.port)}`;

      logger.info("Validating server is listening on port", { url, port: payload.port });

      // First, check if any process is listening on the port
      const maxRetries = 5;
      const retryDelay = 5000; // 5 seconds between attempts
      let isListening = false;
      let isResponding = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Validation attempt ${attempt}/${maxRetries}`);
          
          // Check if port is listening using netstat/ss
          const checkPort = await sandbox.commands.run(
            `ss -tuln | grep ':${payload.port}' || netstat -tuln | grep ':${payload.port}' || lsof -i :${payload.port}`,
            { timeoutMs: 5000 }
          );

          if (checkPort.stdout && checkPort.stdout.trim().length > 0) {
            isListening = true;
            logger.info("Port is listening", { 
              port: payload.port,
              output: checkPort.stdout.substring(0, 200) 
            });
          }

          // Also try HTTP request
          try {
            const response = await fetch(url, {
              method: "HEAD",
              signal: AbortSignal.timeout(5000),
            });

            if (response.ok || response.status === 404 || response.status === 403) {
              // 404/403 are acceptable - server is responding
              isResponding = true;
              logger.info("Server is responding", { 
                url, 
                status: response.status,
                attempt 
              });
            }
          } catch (fetchError: any) {
            // Fetch failed, but port might still be listening
            if (isListening) {
              logger.info("Port is listening but HTTP request failed, might need more time", {
                error: fetchError.message
              });
            }
          }

          // Success if either port is listening or server is responding
          if (isListening || isResponding) {
            logger.info("Validation successful", { 
              isListening, 
              isResponding, 
              attempt 
            });
            break;
          }

          logger.warn(`Port ${payload.port} not ready yet, retrying...`, { attempt });
        } catch (checkError: any) {
          logger.warn(`Port check failed`, { 
            error: checkError.message,
            attempt 
          });
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (!isListening && !isResponding) {
        const errorMsg = `No service found listening on port ${payload.port}. Make sure your server is running and listening on this port.`;
        logger.error(errorMsg, { port: payload.port, url });
        throw new Error(errorMsg);
      }

      logger.info("Server validation complete", { 
        url, 
        isListening, 
        isResponding 
      });

      return {
        url,
        status: "done",
      };
    } catch (error) {
      logger.error("Failed to get sandbox URL", { error });
      throw error;
    } finally {
      // e2b sandboxes don't need explicit closing when using connect
      // The sandbox continues running for other operations
    }
  },
});

