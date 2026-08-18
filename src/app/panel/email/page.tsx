import { content } from "@/lib/email/content";
import { pickValidGeneratedFields } from "@/lib/email/emailContentSchema";
import { PanelNav } from "../PanelNav";
import { LogoutButton } from "../LogoutButton";
import { EmailForm } from "./EmailForm";

export default async function PanelEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  let initialValues = content;
  let awaitingGeneration = params.awaiting === "1";

  if (typeof params.prefill === "string") {
    try {
      const prefill = pickValidGeneratedFields(JSON.parse(params.prefill));
      initialValues = { ...content, ...prefill };
      awaitingGeneration = false;
    } catch {
      // ignore malformed prefill data
    }
  }

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
      <EmailForm initialValues={initialValues} awaitingGeneration={awaitingGeneration} />
    </div>
  );
}
