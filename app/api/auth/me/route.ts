import { getSession } from "@/lib/session";
import { getProfileById, seedDefaults } from "@/lib/store";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  await seedDefaults();
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const profile = await getProfileById(session.sub);
  if (!profile) return jsonError("Unauthorized", 401);
  return jsonOk({
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  });
}
