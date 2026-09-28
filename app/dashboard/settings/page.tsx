import { bootstrapPrimaryAdmin, resolveSessionProfile } from "@/lib/auth";
import { configuredProviders, getEnv, isSupabaseConfigured } from "@/lib/env";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui";

export default async function SettingsPage() {
  await bootstrapPrimaryAdmin();
  const env = getEnv();
  const providers = configuredProviders();
  const session = await getSession();
  const profile = session ? await resolveSessionProfile(session.sub) : null;
  const email = profile?.email ?? session?.email ?? "Unknown";
  const role = profile?.role ?? session?.role ?? "member";
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <h2 className="font-medium">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Signed in as</dt>
            <dd>{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Role</dt>
            <dd className="capitalize">{role}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h2 className="font-medium">Runtime</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {Object.entries(providers).map(([name, ok]) => (
            <div key={name} className="flex justify-between gap-4">
              <dt className="text-muted">{name}</dt>
              <dd>{ok ? "Env key present" : "Not in env (dashboard keys still apply)"}</dd>
            </div>
          ))}
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
          Server-only variables stay on the server. Rotate provider keys, SUPABASE_SERVICE_ROLE_KEY,
          CREDENTIAL_ENCRYPTION_KEY, and API_KEY_HASH_SECRET in Vercel. Never commit .env files. Stored provider
          credentials are AES-256-GCM encrypted and never returned by the API.
        </p>
      </Card>
    </div>
  );
}
