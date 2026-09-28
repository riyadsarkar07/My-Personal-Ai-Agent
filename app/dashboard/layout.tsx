import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/session";
import { seedDefaults } from "@/lib/store";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await seedDefaults();
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-16 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
