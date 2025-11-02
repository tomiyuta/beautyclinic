import { callGemini } from "./gemini";
import { callGrok } from "./grok";
import { callClaude } from "./claude";
import { callChatGPT } from "./chatgpt";

export type AIAgent = "gemini" | "grok" | "claude" | "chatgpt";

export interface AIHealthStatus {
  agent: AIAgent;
  status: "healthy" | "unhealthy" | "unknown";
  lastChecked: Date;
  error?: string;
}

export async function checkAIHealth(): Promise<AIHealthStatus[]> {
  const agents: AIAgent[] = ["gemini", "grok", "claude", "chatgpt"];
  const results: AIHealthStatus[] = [];

  for (const agent of agents) {
    const status: AIHealthStatus = {
      agent,
      status: "unknown",
      lastChecked: new Date(),
    };

    try {
      const testPrompt = "test";
      let response: string;

      switch (agent) {
        case "gemini":
          response = await callGemini(testPrompt);
          break;
        case "grok":
          response = await callGrok(testPrompt);
          break;
        case "claude":
          response = await callClaude(testPrompt);
          break;
        case "chatgpt":
          response = await callChatGPT(testPrompt);
          break;
        default:
          status.status = "unknown";
          results.push(status);
          continue;
      }

      if (response && response.length > 0) {
        status.status = "healthy";
      } else {
        status.status = "unhealthy";
        status.error = "Empty response";
      }
    } catch (error) {
      status.status = "unhealthy";
      status.error =
        error instanceof Error ? error.message : "Unknown error";
    }

    results.push(status);
  }

  return results;
}

export function selectAIAgent(
  taskType: string,
  availableAgents: AIAgent[],
): AIAgent | null {
  // タスクタイプに応じて適切なAIエージェントを選択
  const agentMapping: Record<string, AIAgent[]> = {
    market_research: ["gemini"],
    sns_research_twitter: ["grok"],
    sns_research_instagram: ["gemini"],
    sns_research_youtube: ["gemini"],
    strategy_analysis: ["claude"],
    content_generation: ["chatgpt"],
  };

  const preferredAgents = agentMapping[taskType] || [
    "claude",
    "gemini",
    "chatgpt",
    "grok",
  ];

  // 利用可能なエージェントの中から優先順位に従って選択
  for (const preferred of preferredAgents) {
    if (availableAgents.includes(preferred)) {
      return preferred;
    }
  }

  // フォールバック: 利用可能な最初のエージェント
  return availableAgents.length > 0 ? availableAgents[0] : null;
}

