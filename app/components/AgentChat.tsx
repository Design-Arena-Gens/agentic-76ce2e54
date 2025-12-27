"use client";

import { useCallback, useMemo, useState } from "react";
import styles from "../styles/AgentChat.module.css";

type PlanItem = {
  id: string;
  title: string;
  description: string;
  tool: string;
};

type StepResult = {
  id: string;
  tool: string;
  input: string;
  output: string;
  success: boolean;
  error?: string;
};

type AgentApiResponse = {
  success: boolean;
  plan: PlanItem[];
  steps: StepResult[];
  final: string;
  reasoning: string;
  meta: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  error?: string;
};

type AgentRun = {
  id: string;
  task: string;
  status: "idle" | "running" | "failed" | "completed";
  plan: PlanItem[];
  steps: StepResult[];
  final?: string;
  reasoning?: string;
  error?: string;
  startedAt: string;
  durationMs?: number;
};

function formatDuration(ms?: number) {
  if (!ms) return "";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toFixed(0)}s`;
}

export default function AgentChat() {
  const [input, setInput] = useState("");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const activeRun = runs[0];

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim() || submitting) {
        return;
      }

      const task = input.trim();
      setInput("");
      setSubmitting(true);

      const runId = crypto.randomUUID();
      const startedAt = new Date().toISOString();

      setRuns((prev) => [
        {
          id: runId,
          task,
          status: "running",
          plan: [],
          steps: [],
          startedAt,
        },
        ...prev,
      ]);

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ task }),
        });

        const data: AgentApiResponse = await response.json();

        setRuns((prev) =>
          prev.map((run) =>
            run.id === runId
              ? {
                  ...run,
                  status: data.success ? "completed" : "failed",
                  plan: data.plan ?? [],
                  steps: data.steps ?? [],
                  final: data.final,
                  reasoning: data.reasoning,
                  error: data.success ? undefined : data.error ?? "Agent failed",
                  durationMs: data.meta?.durationMs,
                }
              : run
          )
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        setRuns((prev) =>
          prev.map((run) =>
            run.id === runId
              ? {
                  ...run,
                  status: "failed",
                  error: message,
                }
              : run
          )
        );
      } finally {
        setSubmitting(false);
      }
    },
    [input, submitting]
  );

  const history = useMemo(() => runs.slice(1), [runs]);

  return (
    <section className={styles.shell}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="task" className={styles.label}>
          What should the agent do?
        </label>
        <div className={styles.inputRow}>
          <textarea
            id="task"
            name="task"
            value={input}
            placeholder="Plan a product launch, analyze a dataset, generate learning resources..."
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            required
            className={styles.input}
            disabled={submitting}
          />
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Running" : "Launch"}
          </button>
        </div>
        <p className={styles.hint}>
          The agent performs multi-step planning, calls contextual tools, and synthesizes a final answer for you.
        </p>
      </form>

      {activeRun && (
        <div className={styles.runPanel}>
          <header className={styles.runHeader}>
            <div>
              <h2>Current Task</h2>
              <p>{activeRun.task}</p>
            </div>
            <span
              className={[
                styles.status,
                styles[`status-${activeRun.status}`],
              ].join(" ")}
            >
              {activeRun.status === "running" && "In Progress"}
              {activeRun.status === "completed" && "Completed"}
              {activeRun.status === "failed" && "Failed"}
            </span>
          </header>

          {activeRun.reasoning && (
            <div className={styles.block}>
              <h3>Reasoning Trace</h3>
              <p>{activeRun.reasoning}</p>
            </div>
          )}

          {activeRun.plan.length > 0 && (
            <div className={styles.block}>
              <h3>Plan</h3>
              <ol className={styles.planList}>
                {activeRun.plan.map((item, index) => (
                  <li key={item.id}>
                    <header>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                    </header>
                    <footer>
                      <small>Tool: {item.tool}</small>
                    </footer>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {activeRun.steps.length > 0 && (
            <div className={styles.block}>
              <h3>Tool Invocations</h3>
              <ul className={styles.stepList}>
                {activeRun.steps.map((step) => (
                  <li key={step.id}>
                    <header>
                      <strong>{step.tool}</strong>
                      <span
                        className={[
                          styles.stepStatus,
                          styles[`step-${step.success ? "success" : "fail"}`],
                        ].join(" ")}
                      >
                        {step.success ? "Success" : "Error"}
                      </span>
                    </header>
                    <p>
                      <strong>Input:</strong> {step.input}
                    </p>
                    <p>
                      <strong>Output:</strong> {step.output}
                    </p>
                    {step.error && <p className={styles.error}>{step.error}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeRun.final && (
            <div className={styles.block}>
              <h3>Final Answer</h3>
              <p>{activeRun.final}</p>
            </div>
          )}

          {activeRun.durationMs && (
            <footer className={styles.meta}>
              <span>Duration: {formatDuration(activeRun.durationMs)}</span>
            </footer>
          )}

          {activeRun.error && (
            <div className={styles.block}>
              <h3>Agent Error</h3>
              <p className={styles.error}>{activeRun.error}</p>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <h2>History</h2>
          <ul>
            {history.map((run) => (
              <li key={run.id}>
                <strong>{run.task}</strong>
                <span>
                  {run.status === "completed" && "Completed"}
                  {run.status === "failed" && "Failed"}
                  {run.status === "running" && "In Progress"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
