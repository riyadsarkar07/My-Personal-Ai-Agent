import { getEnv, isGeminiConfigured, isSupabaseConfigured } from "@/lib/env";
import { Card } from "@/components/ui";

export default function SettingsPage() {
  const env = getEnv();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <h2 className="font-medium">Runtime</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Gemini</dt>
            <dd>{isGeminiConfigured() ? "Configured" : "Missing GEMINI_API_KEY"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Default model</dt>
            <dd className="font-mono">{env.GEMINI_MODEL}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Database</dt>
            <dd>{isSupabaseConfigured() ? "Supabase" : "In-memory fallback"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Admin email</dt>
            <dd>{env.ADMIN_EMAIL}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h2 className="font-medium">Secrets</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Server-only variables stay on the server. Rotate GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, and
          API_KEY_HASH_SECRET in Vercel. Never commit .env files.
        </p>
      </Card>
    </div>
  );
}
