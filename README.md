# Vercel Vibe Code (Trigger.dev + e2b Edition)

An AI-powered coding assistant that generates and executes code in isolated sandboxes. This version uses **Trigger.dev** for workflow orchestration and **e2b** for secure sandbox execution.

### Key Components

1. **AI Tools** (`ai/tools/`) - Interface between AI and execution layer
   - Uses Trigger.dev Realtime API to trigger tasks and subscribe to results
   - Maintains synchronous UX despite async task execution

2. **Trigger.dev Tasks** (`trigger/`) - Workflow orchestration
   - `create-sandbox.ts` - Provisions new e2b sandboxes
   - `run-command.ts` - Executes commands in sandboxes
   - `generate-files.ts` - Writes files to sandboxes
   - `get-sandbox-url.ts` - Retrieves public URLs for sandbox services

3. **API Routes** (`app/api/sandboxes/`) - Direct e2b access
   - Status checks
   - Real-time log streaming
   - File operations

## Setup Instructions

### Prerequisites

- Node.js 20.x or higher
- pnpm (recommended) or npm
- Trigger.dev account ([sign up](https://trigger.dev))
- e2b API key ([get one](https://e2b.dev))

### Installation

1. **Clone and install dependencies:**

```bash
pnpm install
```

2. **Configure environment variables:**

Create a `.env.local` file in the project root:

```env
# Trigger.dev Configuration
TRIGGER_SECRET_KEY=tr_dev_your_secret_key_here

# e2b Configuration
E2B_API_KEY=e2b_your_api_key_here
```

3. **Update Trigger.dev project ID:**

Edit `trigger.config.ts` and replace `proj_your_project_id` with your actual Trigger.dev project ID.

4. **Start the local development servers:**

You need to run **two** servers:

**Terminal 1 - Trigger.dev dev server:**
```bash
npx trigger.dev@latest dev
```

**Terminal 2 - Next.js dev server:**
```bash
pnpm dev
```

5. **Open the app:**

Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

### Workflow Execution Flow

1. **User sends a prompt** to the AI assistant
2. **AI decides** which tools to use (create sandbox, generate files, run commands, etc.)
3. **AI tool triggers** a Trigger.dev task with parameters
4. **Trigger.dev task** connects to e2b and performs the operation
5. **AI tool subscribes** to the task run via Realtime API
6. **Results stream back** to the UI in real-time

### Example: Creating and Running Code

```
User: "Create a Next.js app with a Pokemon search"
  ↓
AI Tool: createSandbox()
  ↓
Trigger.dev: create-sandbox task
  ↓
e2b: New sandbox provisioned
  ↓
AI Tool: generateFiles()
  ↓
Trigger.dev: generate-files task
  ↓
e2b: Files written to sandbox
  ↓
AI Tool: runCommand("pnpm install")
  ↓
Trigger.dev: run-command task
  ↓
e2b: Command executed, logs streamed
  ↓
UI: Real-time updates displayed
```

## Hybrid Architecture

- **Trigger.dev tasks** for orchestration (create, run, generate, get URL)
- **Direct e2b API** for real-time features (log streaming, status checks)

This ensures:
- Workflow benefits (retries, monitoring) for operations
- Real-time performance for streaming logs
- Clean separation of concerns

## Project Structure

```
vibe-code-trigger-e2b/
├── ai/
│   ├── tools/              # AI tool implementations
│   │   ├── create-sandbox.ts
│   │   ├── run-command.ts
│   │   ├── generate-files.ts
│   │   └── get-sandbox-url.ts
│   └── gateway.ts          # AI provider configuration
├── trigger/                # Trigger.dev tasks
│   ├── create-sandbox.ts
│   ├── run-command.ts
│   ├── generate-files.ts
│   ├── get-sandbox-url.ts
│   └── types.ts
├── app/
│   ├── api/
│   │   ├── chat/           # AI chat endpoint
│   │   └── sandboxes/      # Sandbox API routes
│   └── [UI components]
├── trigger.config.ts       # Trigger.dev configuration
└── .env.local             # Environment variables
```

## Troubleshooting

### "Trigger.dev task not found"

Make sure the Trigger.dev dev server is running:
```bash
npx trigger.dev@latest dev
```

### "e2b API key invalid"

1. Check your `.env.local` file has the correct key
2. Verify the key at [e2b.dev/dashboard](https://e2b.dev/dashboard)
3. Restart the Next.js dev server after changing env vars

### "Sandbox creation timeout"

e2b sandboxes have a default 5-minute timeout. For longer operations:
- Increase timeout in `trigger/create-sandbox.ts`
- Maximum: 24 hours (Pro), 1 hour (Hobby)

### Logs not streaming

The logs API requires the command to be running in background mode. Ensure:
- Command was started with `wait: false`
- The process ID is valid
- The sandbox is still running

## Deployment

### Production Deployment

1. **Deploy to Vercel/Railway/etc:**
```bash
pnpm build
```

2. **Set production environment variables:**
- Add all `.env.local` variables to your hosting platform
- Use production Trigger.dev secret key (starts with `tr_prod_`)

3. **Deploy Trigger.dev tasks:**
```bash
npx trigger.dev@latest deploy
```

### Environment Variables for Production

```env
TRIGGER_SECRET_KEY=tr_prod_your_production_key
E2B_API_KEY=e2b_your_api_key
```

## Development Tips

### Testing Individual Tasks

Use the Trigger.dev dashboard to test tasks independently:
1. Go to [trigger.dev/dashboard](https://trigger.dev/dashboard)
2. Select your project
3. Navigate to "Tasks"
4. Click "Test" on any task
5. Provide test payload

### Debugging

- **Task logs**: Check Trigger.dev dashboard for task execution logs
- **Sandbox logs**: Use the logs API route to stream command output
- **Network**: Check browser DevTools for API call failures

### Local Development Without Trigger.dev

For rapid iteration, you can temporarily bypass Trigger.dev:
1. Comment out `tasks.trigger()` calls in AI tools
2. Call e2b directly (similar to trigger task implementations)
3. Remember to restore Trigger.dev integration before committing

## Contributing

This project maintains the original Vibe Code UI while replacing the execution layer. When contributing:

1. **Don't modify UI components** unless fixing bugs
2. **Keep AI tools interface consistent** with original
3. **Add tests** for new Trigger.dev tasks
4. **Update docs** for new features

## License

MIT License - see LICENSE file for details

## Credits

- Original Vibe Code by Vercel
- Trigger.dev for workflow orchestration
- e2b for secure sandbox execution
- Built with Next.js, TypeScript, and AI SDK

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Trigger.dev Docs**: [trigger.dev/docs](https://trigger.dev/docs)
- **e2b Docs**: [e2b.dev/docs](https://e2b.dev/docs)
