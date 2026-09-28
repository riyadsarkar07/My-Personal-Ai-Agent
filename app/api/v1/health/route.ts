import { configuredProviders, isSupabaseConfigured } from "@/lib/env";
import { seedDefaults } from "@/lib/store";

export async function GET() {
  await seedDefaults();
  return Response.json({
    data: {
      status: "ok",
      version: "v1",
      timestamp: new Date().toISOString(),
      providers: configuredProviders(),
      gemini: configuredProviders().gemini ? "configured" : "missing",
      database: isSupabaseConfigured() ? "supabase" : "memory",
    },
  });
}
