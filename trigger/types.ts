// Shared types for Trigger.dev tasks

export interface CreateSandboxInput {
  timeout?: number;
  ports?: number[];
}

export interface CreateSandboxOutput {
  sandboxId: string;
  status: string;
}

export interface RunCommandInput {
  sandboxId: string;
  command: string;
  args?: string[];
  sudo?: boolean;
  wait: boolean;
}

export interface RunCommandOutput {
  commandId: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  status: string;
}

export interface GenerateFilesInput {
  sandboxId: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface GenerateFilesOutput {
  paths: string[];
  status: string;
}

export interface GetSandboxURLInput {
  sandboxId: string;
  port: number;
}

export interface GetSandboxURLOutput {
  url: string;
  status: string;
}

