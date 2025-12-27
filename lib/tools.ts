import { randomUUID } from "crypto";

export type ToolContext = {
  task: string;
};

export type ToolExecution = {
  id: string;
  tool: string;
  input: string;
  output: string;
  success: boolean;
  error?: string;
};

export type Tool = {
  name: string;
  description: string;
  execute: (input: string, context: ToolContext) => Promise<ToolExecution>;
};

const KNOWLEDGE_BASE = [
  {
    title: "Agentic AI definition",
    content:
      "Agentic AI systems combine reasoning, planning, and tool usage to autonomously achieve goals across multiple steps.",
  },
  {
    title: "Product launch checklist",
    content:
      "A successful launch involves defining target personas, crafting messaging, creating assets, scheduling announcements, and preparing success metrics.",
  },
  {
    title: "Data storytelling",
    content:
      "Transform raw analysis into narratives by highlighting the question, methodology, insights, and actionable recommendations.",
  },
];

function scoreKnowledgeBase(query: string, doc: { title: string; content: string }) {
  const q = query.toLowerCase();
  const text = `${doc.title} ${doc.content}`.toLowerCase();
  const keywords = q.split(/[^a-z0-9]+/).filter(Boolean);
  const matches = keywords.reduce((total, word) =>
    total + (text.includes(word) ? 1 : 0),
  0);
  return matches;
}

async function knowledgeBaseTool(input: string, context: ToolContext) {
  const ranked = [...KNOWLEDGE_BASE]
    .map((doc) => ({ doc, score: scoreKnowledgeBase(input || context.task, doc) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const output =
    ranked.length > 0
      ? ranked
          .map((entry) => `• ${entry.doc.title}: ${entry.doc.content}`)
          .join("\n")
      : "No relevant knowledge snippets found.";

  return {
    id: randomUUID(),
    tool: "knowledgeBase",
    input,
    output,
    success: true,
  } satisfies ToolExecution;
}

async function searchTool(input: string) {
  if (!input.trim()) {
    return {
      id: randomUUID(),
      tool: "webSearch",
      input,
      output: "Search input missing.",
      success: false,
      error: "The search tool requires a query string.",
    } satisfies ToolExecution;
  }

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(input)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AgenticAIBot/1.0 (+https://agentic-76ce2e54.vercel.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      AbstractText?: string;
      RelatedTopics?: Array<
        | { Text?: string }
        | { Name?: string; Topics?: Array<{ Text?: string }> }
      >;
    };

    const snippets: string[] = [];
    if (data.AbstractText) {
      snippets.push(data.AbstractText);
    }
    data.RelatedTopics?.forEach((topic) => {
      if ("Text" in topic && topic.Text) {
        snippets.push(topic.Text);
      }
      if ("Topics" in topic && topic.Topics) {
        topic.Topics.forEach((t) => t.Text && snippets.push(t.Text));
      }
    });

    const output = snippets.slice(0, 4).join("\n") || "No search snippets returned.";

    return {
      id: randomUUID(),
      tool: "webSearch",
      input,
      output,
      success: true,
    } satisfies ToolExecution;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      id: randomUUID(),
      tool: "webSearch",
      input,
      output: "Search failed.",
      success: false,
      error: message,
    } satisfies ToolExecution;
  }
}

function isSafeMathExpression(expression: string) {
  return /^[0-9+\-*/().%\s^]*$/.test(expression);
}

async function calculatorTool(input: string) {
  if (!input.trim()) {
    return {
      id: randomUUID(),
      tool: "calculator",
      input,
      output: "No expression provided.",
      success: false,
      error: "Expression required for calculator tool.",
    } satisfies ToolExecution;
  }

  if (!isSafeMathExpression(input)) {
    return {
      id: randomUUID(),
      tool: "calculator",
      input,
      output: "",
      success: false,
      error: "Expression contains unsupported characters.",
    } satisfies ToolExecution;
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${input});`)();
    return {
      id: randomUUID(),
      tool: "calculator",
      input,
      output: `Result: ${result}`,
      success: true,
    } satisfies ToolExecution;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      id: randomUUID(),
      tool: "calculator",
      input,
      output: "",
      success: false,
      error: message,
    } satisfies ToolExecution;
  }
}

export const TOOLKIT: Tool[] = [
  {
    name: "webSearch",
    description: "Live web search using DuckDuckGo instant answer API.",
    execute: (input, context) => searchTool(input || context.task),
  },
  {
    name: "calculator",
    description: "Solve mathematical expressions including +, -, *, /, %, and ^.",
    execute: (input) => calculatorTool(input),
  },
  {
    name: "knowledgeBase",
    description: "Query snippets from a curated strategy and AI knowledge base.",
    execute: (input, context) => knowledgeBaseTool(input || context.task, context),
  },
];

export function getToolByName(name: string) {
  return TOOLKIT.find((tool) => tool.name.toLowerCase() === name.toLowerCase());
}
