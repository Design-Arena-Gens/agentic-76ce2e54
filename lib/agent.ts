import OpenAI from "openai";
import { randomUUID } from "crypto";
import { TOOLKIT, getToolByName, ToolExecution } from "./tools";

type PlanItem = {
  id: string;
  title: string;
  description: string;
  tool: string;
};

type PlanPayload = {
  reasoning: string;
  plan: PlanItem[];
};

export type AgentOutcome = {
  success: boolean;
  plan: PlanItem[];
  steps: ToolExecution[];
  final: string;
  reasoning: string;
  meta: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  error?: string;
};

const FALLBACK_PLAN_LIMIT = 3;

function buildPlanSchema() {
  return {
    name: "AgentPlan",
    schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "Short paragraph summarizing the strategy before executing tools.",
        },
        plan: {
          type: "array",
          description: "2-4 steps describing how to solve the task by invoking available tools.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Stable identifier for the step." },
              title: { type: "string" },
              description: { type: "string" },
              tool: {
                type: "string",
                enum: TOOLKIT.map((tool) => tool.name),
              },
            },
            required: ["id", "title", "description", "tool"],
          },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ["reasoning", "plan"],
      additionalProperties: false,
    },
  } as const;
}

function buildFallbackPlan(task: string): PlanPayload {
  const plan: PlanItem[] = [];
  const lowerTask = task.toLowerCase();

  if (/(analy\w+|calculate|percent|growth|increase|decrease|budget|roi)/.test(lowerTask)) {
    plan.push({
      id: randomUUID(),
      title: "Quantify key numbers",
      description: "Use the calculator to work through the core numeric components of the request.",
      tool: "calculator",
    });
  }

  if (/(research|find|latest|current|news|market)/.test(lowerTask)) {
    plan.push({
      id: randomUUID(),
      title: "Collect live context",
      description: "Pull quick snippets from the web to augment knowledge with recent information.",
      tool: "webSearch",
    });
  }

  plan.push({
    id: randomUUID(),
    title: "Reference built-in playbooks",
    description: "Consult the knowledge base for strategic or evergreen guidance.",
    tool: "knowledgeBase",
  });

  return {
    reasoning: "Generated plan via heuristic fallback because the OpenAI API key is not configured.",
    plan: plan.slice(0, FALLBACK_PLAN_LIMIT),
  };
}

async function executePlan(plan: PlanItem[], task: string) {
  const executions: ToolExecution[] = [];

  for (const step of plan) {
    const tool = getToolByName(step.tool);

    if (!tool) {
      executions.push({
        id: randomUUID(),
        tool: step.tool,
        input: "",
        output: "Tool not available.",
        success: false,
        error: `Tool ${step.tool} is not registered.`,
      });
      continue;
    }

    const execution = await tool.execute(step.description, { task });
    executions.push(execution);
  }

  return executions;
}

async function callOpenAIForPlan(task: string, client: OpenAI): Promise<PlanPayload> {
  const response = await (client as unknown as { responses: { create: Function } }).responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You are an autonomous planner. Build a concise tool-usage plan for the task using the provided toolkit. Avoid narration, return JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Task: ${task}\nAvailable tools:\n${TOOLKIT.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")}`,
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: buildPlanSchema(),
    },
  });

  const planText = response.output_text;
  const payload = JSON.parse(planText) as PlanPayload;

  return payload;
}

async function callOpenAIForFinal(
  task: string,
  plan: PlanItem[],
  steps: ToolExecution[],
  client: OpenAI
) {
  const response = await (client as unknown as { responses: { create: Function } }).responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You are an expert AI agent. Summarize the results of the completed plan for the user. Highlight insights, make recommendations, and keep it concise but actionable.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify({ task, plan, steps }),
          },
        ],
      },
    ],
  });

  return response.output_text;
}

export async function runAgentTask(task: string): Promise<AgentOutcome> {
  const startedAt = new Date();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const fallbackPlan = buildFallbackPlan(task);
    const steps = await executePlan(fallbackPlan.plan, task);
    const final =
      "The live LLM backend is not configured, but here is an offline plan and tool output you can use as a starting point.";

    return {
      success: true,
      plan: fallbackPlan.plan,
      steps,
      final,
      reasoning: fallbackPlan.reasoning,
      meta: {
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 0,
      },
      error: "OpenAI API key missing. Configure OPENAI_API_KEY to enable full agentic reasoning.",
    };
  }

  const client = new OpenAI({ apiKey });

  try {
    const planPayload = await callOpenAIForPlan(task, client);
    const steps = await executePlan(planPayload.plan, task);
    const final = await callOpenAIForFinal(task, planPayload.plan, steps, client);
    const completedAt = new Date();

    return {
      success: true,
      plan: planPayload.plan,
      steps,
      final,
      reasoning: planPayload.reasoning,
      meta: {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
    };
  } catch (error) {
    const completedAt = new Date();
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      plan: [],
      steps: [],
      final: "",
      reasoning: "",
      meta: {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
      error: message,
    };
  }
}
