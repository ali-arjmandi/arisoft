"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "idle" | "submitting" | "error";

export function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid credentials.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <div>
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-lg border border-[#AAAAAA] px-4 py-3 text-sm placeholder-[#888] outline-none transition-colors focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-blue-gradient border border-primary px-7 py-3.5 text-sm font-medium text-white transition duration-300 hover:shadow-md hover:shadow-primary/50 disabled:opacity-60"
      >
        {status === "submitting" ? "Signing in..." : "Sign in"}
      </button>

      {status === "error" && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
