"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/dashboard/projects");
    const json = await res.json();
    setProjects(json.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/dashboard/projects");
      const json = await res.json();
      if (!cancelled) setProjects(json.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/dashboard/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        rateLimitRpm: Number(form.get("rateLimitRpm") || 60),
        rateLimitRpd: Number(form.get("rateLimitRpd") || 10000),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message || "Could not create project");
      return;
    }
    event.currentTarget.reset();
    setError("");
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5 lg:col-span-1">
          <h2 className="font-medium">New project</h2>
          <div className="mt-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="mt-3">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rateLimitRpm">RPM</Label>
              <Input id="rateLimitRpm" name="rateLimitRpm" type="number" defaultValue={60} />
            </div>
            <div>
              <Label htmlFor="rateLimitRpd">RPD</Label>
              <Input id="rateLimitRpd" name="rateLimitRpd" type="number" defaultValue={10000} />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <Button className="mt-4 w-full">Create project</Button>
        </form>
        <div className="space-y-3 lg:col-span-2">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{project.name}</h3>
                  <Badge tone={project.status === "active" ? "success" : "neutral"}>{project.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{project.description || "No description"}</p>
                <p className="mt-2 font-mono text-xs text-muted">{project.id}</p>
              </div>
              <p className="text-sm text-muted">
                {project.rate_limit_rpm} rpm / {project.rate_limit_rpd} rpd
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
