# Agentic AI Bot

A Next.js web application that showcases an agentic AI workflow. Users submit a goal and the agent responds with a multi-step plan, executes registered tools (web search, calculator, knowledge snippets), and synthesises a final answer.

## Getting Started

### Prerequisites

- Node.js 18.17+ (or any version supported by Next.js 14)
- npm (comes with Node.js)
- Optional: `OPENAI_API_KEY` environment variable for full LLM-powered reasoning

### Installation

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the agent.

## Environment Variables

| Variable          | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `OPENAI_API_KEY`  | Required for LLM planning/final synthesis. Without it, fallback mode. |

## Project Structure

```
app/
  api/agent/route.ts   # API endpoint driving the agent pipeline
  components/          # UI components
  styles/              # CSS modules and global styles
  page.tsx             # Entry page
lib/
  agent.ts             # Core orchestration logic
  tools.ts             # Tool registry and implementations
```

## Scripts

- `npm run dev` – Start the development server
- `npm run build` – Production build
- `npm start` – Run the production server
- `npm run lint` – ESLint with Next.js config

## How It Works

1. The UI sends the user task to `/api/agent`.
2. The server generates a multi-step plan (OpenAI or heuristic fallback).
3. Registered tools execute the plan: live web search, calculator, and knowledge snippets.
4. The agent summarises results into an actionable final response.

## Deployment

Ready for Vercel deployment. After installing dependencies and building locally, run:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-76ce2e54
```

## License

MIT
