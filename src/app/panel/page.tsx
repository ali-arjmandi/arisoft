import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/panel/session";
import { LoginForm } from "./LoginForm";

export default async function PanelLoginPage() {
  const cookieStore = await cookies();
  const authenticated = await verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (authenticated) {
    redirect("/panel/email");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold text-foreground">Panel login</h1>
      <p className="mt-2 text-sm text-body">Sign in to send the branded email template.</p>
      <LoginForm />
    </div>
  );
}
