import { content } from "@/lib/email/content";
import { pickValidGeneratedFields } from "@/lib/email/emailContentSchema";
import { EmailForm } from "./EmailForm";

export default async function DashboardEmailPage({
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

  return <EmailForm initialValues={initialValues} awaitingGeneration={awaitingGeneration} />;
}
