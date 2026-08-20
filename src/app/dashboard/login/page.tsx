import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/dashboard/session";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default async function DashboardLoginPage() {
  const cookieStore = await cookies();
  const authenticated = await verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (authenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-bg px-6 py-16">
      <div className="w-full max-w-md">
        <Logo className="mb-10 justify-center" />
        <h1 className="text-center text-2xl font-semibold text-foreground">Dashboard login</h1>
        <p className="mt-2 text-center text-sm text-body">Sign in to access the Arisoft dashboard.</p>
        <LoginForm />
      </div>
    </div>
  );
}
