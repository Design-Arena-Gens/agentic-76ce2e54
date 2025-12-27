import { NextResponse } from "next/server";
import { runAgentTask } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = typeof body.task === "string" ? body.task.trim() : "";

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          plan: [],
          steps: [],
          final: "",
          reasoning: "",
          meta: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: 0,
          },
          error: "Task is required.",
        },
        { status: 400 }
      );
    }

    const outcome = await runAgentTask(task);

    return NextResponse.json(outcome, { status: outcome.success ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        plan: [],
        steps: [],
        final: "",
        reasoning: "",
        meta: {
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
        },
        error: message,
      },
      { status: 500 }
    );
  }
}
