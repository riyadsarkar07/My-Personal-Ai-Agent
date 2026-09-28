import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth";
import { getSession } from "@/lib/session";

export default async function ProvidersLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPlatformAdmin(session.role)) redirect("/dashboard");
  return children;
}
