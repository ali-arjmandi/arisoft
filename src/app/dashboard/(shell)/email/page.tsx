import { content } from "@/lib/email/content";
import type { EmailContent } from "@/lib/email/content";
import { pickValidGeneratedFields } from "@/lib/email/emailContentSchema";
import { getEmailById } from "@/lib/companies/emails";
import { EmailForm } from "./EmailForm";

export default async function DashboardEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  let initialValues: EmailContent = content;
  let awaitingGeneration = params.awaiting === "1";
  let initialCompanyId: string | undefined;
  let initialIncludeCta: boolean | undefined;
  let initialIncludeUnsubscribe: boolean | undefined;
  let isTemplateEdit = false;

  if (typeof params.templateId === "string") {
    const template = await getEmailById(params.templateId);
    // Editing a template loads its full content as a starting point but
    // never touches the row itself — the receiver is deliberately left
    // blank so it's filled in manually, and Send/Queue always create a
    // separate email. A missing/non-draft id just falls through to the
    // blank default below.
    if (template && template.status === "draft") {
      initialValues = template.content;
      initialCompanyId = template.companyId ?? undefined;
      initialIncludeCta = Boolean(template.content.ctaLabel || template.content.ctaUrl);
      initialIncludeUnsubscribe = Boolean(template.content.unsubscribeUrl);
      isTemplateEdit = true;
      awaitingGeneration = false;
    }
  } else if (typeof params.prefill === "string") {
    try {
      const prefill = pickValidGeneratedFields(JSON.parse(params.prefill));
      initialValues = { ...content, ...prefill };
      awaitingGeneration = false;
    } catch {
      // ignore malformed prefill data
    }
  }

  return (
    <EmailForm
      initialValues={initialValues}
      awaitingGeneration={awaitingGeneration}
      initialCompanyId={initialCompanyId}
      initialIncludeCta={initialIncludeCta}
      initialIncludeUnsubscribe={initialIncludeUnsubscribe}
      isTemplateEdit={isTemplateEdit}
    />
  );
}
