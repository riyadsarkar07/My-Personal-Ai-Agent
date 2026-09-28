import { createOpenAiCompatAdapter } from "../openai-compat";

export const groqAdapter = createOpenAiCompatAdapter({
  id: "groq",
  baseUrl: "https://api.groq.com/openai/v1",
});
