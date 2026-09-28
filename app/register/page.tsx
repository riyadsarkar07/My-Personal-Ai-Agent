"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(json.error?.message || "Unable to register");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid-bg flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={onSubmit} className="glow-card w-full max-w-md rounded-2xl bg-surface p-8">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-muted">Creates a member workspace. Admin access is assigned server-side.</p>
        <div className="mt-6">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="mt-4">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="mt-4">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="mt-6 w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
        <p className="mt-4 text-center text-sm text-muted">
          Already registered?{" "}
          <Link href="/login" className="text-secondary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
