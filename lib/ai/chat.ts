import { generateReply, streamReply } from "./engine";
import {
  addMessage,
  createConversationRecord,
  getAgent,
  getConversation,
  listAgentTools,
  listMessages,
  logUsage,
} from "../store";
import type { Agent, Conversation, Project } from "../types";
import { truncate } from "../utils";

export class ChatError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function resolveAgent(project: Project, agentId?: string): Promise<Agent> {
  if (agentId) {
    const agent = await getAgent(agentId);
    if (!agent || agent.project_id !== project.id) {
      throw new ChatError("Agent not found in this project", 404);
    }
    if (agent.status !== "active") throw new ChatError("Agent is disabled", 403);
    return agent;
  }
  const { listAgents } = await import("../store");
  const agents = await listAgents(project.id);
  const active = agents.find((a) => a.status === "active");
  if (!active) throw new ChatError("No active agent in this project", 404);
  return active;
}

export async function resolveConversation(
  project: Project,
  agent: Agent,
  conversationId: string | undefined,
  firstMessage: string,
): Promise<Conversation> {
  if (conversationId) {
    const existing = await getConversation(conversationId);
    if (!existing || existing.project_id !== project.id) {
      throw new ChatError("Conversation not found in this project", 404);
    }
    return existing;
  }
  return createConversationRecord({
    project_id: project.id,
    agent_id: agent.id,
    title: truncate(firstMessage, 60),
    metadata: {},
  });
}

export async function runChat(options: {
  project: Project;
  agent: Agent;
  conversation: Conversation;
  message: string;
  temperature?: number;
  maxTokens?: number;
  apiKeyId?: string | null;
  path: string;
}) {
  const started = Date.now();
  const history = await listMessages(options.conversation.id);
  await addMessage({
    conversation_id: options.conversation.id,
    role: "user",
    content: options.message,
    token_count: Math.ceil(options.message.length / 4),
  });
  const tools = await listAgentTools(options.agent.id);
  try {
    const result = await generateReply({
      agent: options.agent,
      tools,
      history,
      userMessage: options.message,
      temperature: options.temperature,
      maxTokens: options.maxTokens ?? Math.min(options.agent.max_tokens, options.project.max_tokens_per_request),
    });
    const assistant = await addMessage({
      conversation_id: options.conversation.id,
      role: "assistant",
      content: result.text,
      token_count: result.completionTokens,
    });
    await logUsage({
      project_id: options.project.id,
      agent_id: options.agent.id,
      api_key_id: options.apiKeyId ?? null,
      conversation_id: options.conversation.id,
      model: result.model,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      latency_ms: Date.now() - started,
      status: "success",
      error: null,
      path: options.path,
    });
    return { result, assistant };
  } catch (error) {
    await logUsage({
      project_id: options.project.id,
      agent_id: options.agent.id,
      api_key_id: options.apiKeyId ?? null,
      conversation_id: options.conversation.id,
      model: options.agent.model,
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: Date.now() - started,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      path: options.path,
    });
    throw error;
  }
}

export async function runChatStream(options: {
  project: Project;
  agent: Agent;
  conversation: Conversation;
  message: string;
  temperature?: number;
  maxTokens?: number;
  apiKeyId?: string | null;
  path: string;
  onChunk: (text: string) => void;
}) {
  const started = Date.now();
  const history = await listMessages(options.conversation.id);
  await addMessage({
    conversation_id: options.conversation.id,
    role: "user",
    content: options.message,
    token_count: Math.ceil(options.message.length / 4),
  });
  const tools = await listAgentTools(options.agent.id);
  const result = await streamReply(
    {
      agent: options.agent,
      tools,
      history,
      userMessage: options.message,
      temperature: options.temperature,
      maxTokens: options.maxTokens ?? Math.min(options.agent.max_tokens, options.project.max_tokens_per_request),
    },
    options.onChunk,
  );
  await addMessage({
    conversation_id: options.conversation.id,
    role: "assistant",
    content: result.text,
    token_count: result.completionTokens,
  });
  await logUsage({
    project_id: options.project.id,
    agent_id: options.agent.id,
    api_key_id: options.apiKeyId ?? null,
    conversation_id: options.conversation.id,
    model: result.model,
    prompt_tokens: result.promptTokens,
    completion_tokens: result.completionTokens,
    latency_ms: Date.now() - started,
    status: "success",
    error: null,
    path: options.path,
  });
  return result;
}
