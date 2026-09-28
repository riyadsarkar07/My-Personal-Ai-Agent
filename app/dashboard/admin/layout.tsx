import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminSectionLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return children;
}
