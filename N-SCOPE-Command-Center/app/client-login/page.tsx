import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/primitives";

export default function ClientLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Client Portal Login</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              View your company devices, assets, tickets, and support status.
            </p>
          </div>
          <LoginForm mode="client" redirectTo="/client-portal" />
          <Link href="/login" className="mt-4 block text-center text-sm font-medium text-accent">
            Login as N-SCOPE team
          </Link>
        </Card>
      </div>
    </main>
  );
}
