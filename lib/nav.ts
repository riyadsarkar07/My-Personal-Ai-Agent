export const USER_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/agents", label: "Agents" },
  { href: "/dashboard/playground", label: "Playground" },
  { href: "/dashboard/keys", label: "API Keys" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/memory", label: "Memory" },
  { href: "/dashboard/docs", label: "Documentation" },
] as const;

export const ADMIN_NAV = [
  { href: "/dashboard/admin", label: "Users" },
  { href: "/dashboard/providers", label: "Providers" },
  { href: "/dashboard/routing", label: "Routing" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;
