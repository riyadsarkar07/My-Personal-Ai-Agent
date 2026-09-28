function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function requiredNames() {
  return {
    GEMINI_API_KEY: optional("GEMINI_API_KEY"),
    GEMINI_MODEL: optional("GEMINI_MODEL", "gemini-2.0-flash"),
    OPENAI_API_KEY: optional("OPENAI_API_KEY"),
    ANTHROPIC_API_KEY: optional("ANTHROPIC_API_KEY"),
    GROQ_API_KEY: optional("GROQ_API_KEY"),
    OPENROUTER_API_KEY: optional("OPENROUTER_API_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: optional("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY"),
    APP_URL: optional("APP_URL", "http://localhost:3000"),
    ADMIN_EMAIL: optional("ADMIN_EMAIL", "admin@localhost"),
    ADMIN_USER_ID: optional("ADMIN_USER_ID"),
    API_KEY_HASH_SECRET: optional("API_KEY_HASH_SECRET", "dev-only-change-me"),
    SESSION_SECRET: optional("SESSION_SECRET") || optional("API_KEY_HASH_SECRET", "dev-only-change-me"),
    CREDENTIAL_ENCRYPTION_KEY: optional("CREDENTIAL_ENCRYPTION_KEY"),
  };
}

export function getEnv() {
  return requiredNames();
}

export function isSupabaseAuthConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http"),
  );
}

export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(isSupabaseAuthConfigured() && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isGeminiConfigured(): boolean {
  return Boolean(getEnv().GEMINI_API_KEY);
}

export function envKeyForProvider(provider: "gemini" | "openai" | "anthropic" | "groq" | "openrouter"): string {
  const env = getEnv();
  switch (provider) {
    case "gemini":
      return env.GEMINI_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "groq":
      return env.GROQ_API_KEY;
    case "openrouter":
      return env.OPENROUTER_API_KEY;
  }
}

export function configuredProviders() {
  return {
    gemini: isGeminiConfigured(),
    openai: Boolean(getEnv().OPENAI_API_KEY),
    anthropic: Boolean(getEnv().ANTHROPIC_API_KEY),
    groq: Boolean(getEnv().GROQ_API_KEY),
    openrouter: Boolean(getEnv().OPENROUTER_API_KEY),
  };
}
