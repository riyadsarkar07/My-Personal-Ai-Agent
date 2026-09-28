import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { bootstrapPrimaryAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await bootstrapPrimaryAdmin();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar email={user.email} isAdmin={isPlatformAdmin(user)} />
      <main className="min-w-0 flex-1 px-4 py-16 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
