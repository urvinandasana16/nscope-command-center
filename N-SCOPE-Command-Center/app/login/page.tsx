import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/primitives";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Welcome to N-SCOPE Command Center</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Centralized IT Operations, Monitoring & Remote Management Platform
            </p>
          </div>
          <LoginForm />
          <div className="mt-4 grid gap-2 text-center text-sm font-medium">
            <Link href="/client-login" className="text-accent">
              Client portal login
            </Link>
            <Link href="/login" className="text-slate-500 dark:text-slate-400">
              Forgot password?
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
