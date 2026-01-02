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

      logger.info("Validating server is accessible", { url, port: payload.port });

      // Optimized validation - reduced retries and delays for faster response
      const maxRetries = 3;        // Reduced from 5
      const retryDelay = 2000;     // Reduced from 5000ms (2 seconds)
      let isAccessible = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Validation attempt ${attempt}/${maxRetries}`);
          
          // Skip port check command - just try HTTP request directly
          // If HTTP works, we know the port is listening
          const response = await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(3000), // Reduced from 5s to 3s
          });

          // Accept any response (even 404/500) - server is responding
          if (response.status) {
            isAccessible = true;
            logger.info("Server is accessible", { 
              url, 
              status: response.status,
              attempt 
            });
            break; // Exit immediately on success
          }
        } catch (fetchError: any) {
          logger.warn(`Attempt ${attempt} failed`, { 
            error: fetchError.message,
            attempt 
          });
        }

        // Don't wait after last attempt
        if (attempt < maxRetries && !isAccessible) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      // Return URL even if validation fails - let user/frontend decide
      if (!isAccessible) {
        logger.warn(`Server on port ${payload.port} didn't respond to validation, but returning URL anyway`, {
          port: payload.port,
          url
        });
        // Don't throw - return the URL and let user verify it's working
      }

      logger.info("URL retrieval complete", { url, isAccessible });

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

