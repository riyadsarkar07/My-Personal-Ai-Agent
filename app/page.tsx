import Link from "next/link";
import { ArrowRight, Bot, KeyRound, Layers, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Reusable Gemini agents",
    body: "Configure personality, model, memory, and tools once. Call the same agent from every product.",
  },
  {
    icon: KeyRound,
    title: "Hashed API keys",
    body: "Raw keys are shown once. Only HMAC hashes are stored. Revoke or rotate without downtime.",
  },
  {
    icon: Layers,
    title: "Project isolation",
    body: "Websites, mobile apps, and internal tools stay sandboxed with independent quotas and conversations.",
  },
  {
    icon: Zap,
    title: "Streaming REST API",
    body: "SSE chat, versioned /api/v1 endpoints, and a typed TypeScript SDK for any runtime.",
  },
  {
    icon: Shield,
    title: "Server-side secrets",
    body: "Gemini keys never leave the server. Prompt-injection guards and sandboxed tools are built in.",
  },
];

export default function Home() {
  return (
    <div className="grid-bg min-h-dvh">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm">N</span>
          Nexus Agent
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="min-h-11 px-3 text-sm text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover"
          >
            Get started
          </Link>
        </nav>
      </header>
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
        <p className="mb-4 text-sm font-medium tracking-wide text-secondary">UNIVERSAL AI AGENT PLATFORM</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          One Gemini agent.
          <br />
          Every product.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-muted">
          Build a production AI agent once and reuse it across websites, mobile apps, and internal tools through a
          secure, versioned REST API.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary hover:bg-primary-hover"
          >
            Open dashboard <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard/docs"
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm"
          >
            Read the API docs
          </Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="rounded-xl border border-border bg-surface p-5">
              <Icon className="mb-3 text-secondary" size={22} aria-hidden />
              <h2 className="text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
