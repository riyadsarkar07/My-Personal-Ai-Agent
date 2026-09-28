import { redirect } from "next/navigation";
import { isPlatformAdmin } from "./rbac";
import { getCurrentUser } from "./session";

export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isPlatformAdmin(user)) redirect("/dashboard");
  return user;
}
