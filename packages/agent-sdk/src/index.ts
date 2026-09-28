export class AgentSDKError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "AgentSDKError";
    this.status = status;
  }
}

export interface UniversalAgentOptions {
  baseURL: string;
  apiKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface ChatParams {
  message: string;
  agentId?: string;
  conversationId?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  id: string;
  conversationId: string;
  agentId: string;
  message: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface StreamHandlers {
  onDelta?: (text: string) => void;
  onMeta?: (meta: { conversationId: string; agentId: string }) => void;
  onDone?: (payload: ChatResponse | { conversationId: string; message: string; usage: ChatResponse["usage"] }) => void;
  onError?: (message: string) => void;
}

function assertServerSide(apiKey: string) {
  if (typeof window !== "undefined") {
    throw new AgentSDKError(
      "Do not instantiate UniversalAgent in the browser. Proxy requests through your own backend so the API key stays server-side.",
      400,
    );
  }
  if (!apiKey) throw new AgentSDKError("apiKey is required", 401);
}

export class UniversalAgent {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: UniversalAgentOptions) {
    assertServerSide(options.apiKey);
    this.baseURL = options.baseURL.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseURL}${path}`, {
        ...init,
        headers: { ...this.headers(), ...(init.headers ?? {}) },
        signal: controller.signal,
      });
      const json = (await response.json().catch(() => ({}))) as {
        data?: T;
        error?: { message?: string; status?: number };
      };
      if (!response.ok) {
        throw new AgentSDKError(json.error?.message || `Request failed (${response.status})`, response.status);
      }
      return (json.data ?? json) as T;
    } catch (error) {
      if (error instanceof AgentSDKError) throw error;
      if ((error as { name?: string }).name === "AbortError") {
        throw new AgentSDKError("Request timed out", 504);
      }
      throw new AgentSDKError(error instanceof Error ? error.message : "Network error", 500);
    } finally {
      clearTimeout(timer);
    }
  }

  chat(params: ChatParams): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async stream(params: ChatParams, handlers: StreamHandlers = {}): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const response = await this.fetchImpl(`${this.baseURL}/chat/stream`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      const json = await response.json().catch(() => ({}));
      throw new AgentSDKError((json as { error?: { message?: string } }).error?.message || "Stream failed", response.status);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const event = /event: (\w+)/.exec(chunk)?.[1];
          const dataLine = chunk
            .split("\n")
            .filter((l) => l.startsWith("data: "))
            .map((l) => l.slice(6))
            .join("");
          if (!event || !dataLine) continue;
          const data = JSON.parse(dataLine) as Record<string, unknown>;
          if (event === "delta") {
            const text = String(data.text ?? "");
            full += text;
            handlers.onDelta?.(text);
          } else if (event === "meta") {
            handlers.onMeta?.(data as { conversationId: string; agentId: string });
          } else if (event === "done") {
            handlers.onDone?.(data as never);
          } else if (event === "error") {
            handlers.onError?.(String(data.message ?? "Stream error"));
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }
    return full;
  }

  listAgents() {
    return this.request<unknown[]>("/agents");
  }

  getAgent(id: string) {
    return this.request(`/agents/${id}`);
  }

  createAgent(body: Record<string, unknown>) {
    return this.request("/agents", { method: "POST", body: JSON.stringify(body) });
  }

  listConversations() {
    return this.request("/conversations");
  }

  getConversation(id: string) {
    return this.request(`/conversations/${id}`);
  }

  deleteConversation(id: string) {
    return this.request(`/conversations/${id}`, { method: "DELETE" });
  }

  usage() {
    return this.request("/usage");
  }

  health() {
    return this.request("/health");
  }
}

export function createServerProxyHandler(options: UniversalAgentOptions) {
  const agent = new UniversalAgent(options);
  return async (request: Request) => {
    const body = (await request.json()) as ChatParams;
    const data = await agent.chat(body);
    return Response.json({ data });
  };
}
