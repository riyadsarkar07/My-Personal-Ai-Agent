import { createOpenAiCompatAdapter } from "../openai-compat";

export const openrouterAdapter = createOpenAiCompatAdapter({
  id: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  extraHeaders: () => ({
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "Nexus Agent",
  }),
});
