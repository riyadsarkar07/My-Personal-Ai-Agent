function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function requiredNames() {
  return {
    GEMINI_API_KEY: optional("GEMINI_API_KEY"),
    GEMINI_MODEL: optional("GEMINI_MODEL", "gemini-2.0-flash"),
    NEXT_PUBLIC_SUPABASE_URL: optional("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY"),
    APP_URL: optional("APP_URL", "http://localhost:3000"),
    ADMIN_EMAIL: optional("ADMIN_EMAIL", "admin@localhost"),
    API_KEY_HASH_SECRET: optional("API_KEY_HASH_SECRET", "dev-only-change-me"),
    SESSION_SECRET: optional("SESSION_SECRET") || optional("API_KEY_HASH_SECRET", "dev-only-change-me"),
  };
}

export function getEnv() {
  return requiredNames();
}

export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http"),
  );
}

export function isGeminiConfigured(): boolean {
  return Boolean(getEnv().GEMINI_API_KEY);
}
