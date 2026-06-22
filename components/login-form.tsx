"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ApiError } from "@/lib/api";
import { login } from "@/services/authService";
import { Button, Field, Input } from "./ui/primitives";

type LoginFormProps = {
  mode?: "admin" | "client";
  redirectTo?: string;
};

export function LoginForm({ mode = "admin", redirectTo = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await login(email, password);
      router.push(redirectTo);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field label="Email">
        <Input type="email" placeholder={mode === "client" ? "client email" : "admin@nscope.local"} value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field label="Password">
        <Input type="password" placeholder="Enter password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      {message && <p className="text-sm text-amber-600 dark:text-amber-300">{message}</p>}
      <Button className="mt-2 w-full" disabled={loading}>
        {loading ? "Signing in..." : mode === "client" ? "Login to Client Portal" : "Login"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
