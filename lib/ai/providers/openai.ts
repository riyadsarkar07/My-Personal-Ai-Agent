import { createOpenAiCompatAdapter } from "../openai-compat";

export const openaiAdapter = createOpenAiCompatAdapter({
  id: "openai",
  baseUrl: "https://api.openai.com/v1",
});
