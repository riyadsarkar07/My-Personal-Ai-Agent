import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { bootstrapPrimaryAdmin, isPlatformAdmin } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await bootstrapPrimaryAdmin();
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar isAdmin={isPlatformAdmin(session.role)} />
      <main className="min-w-0 flex-1 px-4 py-16 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
