import { content } from "@/lib/email/content";
import { PanelNav } from "../PanelNav";
import { LogoutButton } from "../LogoutButton";
import { EmailForm } from "./EmailForm";

export default function PanelEmailPage() {
  return (
    <div>
      <PanelNav />
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Send branded email</h1>
          <p className="mt-2 text-sm text-body">Edit the fields below, pick a recipient and sender, then send.</p>
        </div>
        <LogoutButton />
      </div>
      <EmailForm initialValues={content} />
    </div>
  );
}
