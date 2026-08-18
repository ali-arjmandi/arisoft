import { content } from "@/lib/email/content";
import { EmailForm } from "./EmailForm";
import { LogoutButton } from "./LogoutButton";

export default function PanelEmailPage() {
  return (
    <div>
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
