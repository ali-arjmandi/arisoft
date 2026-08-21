import OpenAI from "openai";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import {
  GENERATED_EMAIL_SCHEMA,
  parseGeneratedEmailContent,
  type GeneratedEmailContent,
} from "@/lib/email/emailContentSchema";
import { getOrCreateReportUrl, getPublicSiteUrl } from "@/lib/reports/reportLinks";

const REPORT_URL_PLACEHOLDER = "{{report_url}}";

const SYSTEM_PROMPT = `You write cold outreach emails for Arisoft, a company that builds AI automation for small and medium businesses. The audience is a specific company that Arisoft has researched: a busy business owner or operations lead who is practical and skeptical of hype. Assume they will read this on their phone in about 15 seconds. Length is a feature, not a compromise — a shorter email that gets read beats a longer one that gets skimmed and deleted.

You will receive a JSON object with the results of research Arisoft did on this company: what was found about how they operate, and the automation opportunities identified for them. Turn this into one outreach email addressed to that company, using the facts in the JSON directly. Do not write a generic email; every sentence should reflect this specific company.

How to use the JSON:
- companyName: the company being emailed.
- companySummary and industrySubsegment: what the company does and what kind of business it is.
- websiteFindings (servicesListed, manualProcessSignals, openVacancies, toolsMentioned): concrete signals of how they currently work, used to narrate what Arisoft noticed about them.
- automationOpportunities: an array of specific opportunities, each with a name, the Arisoft service it maps to, an explanation, the evidence behind it, and an isBestMatch boolean. Use ONLY the single entry where isBestMatch is true. Ignore every other entry in the array entirely, even if it looks interesting. If no entry has isBestMatch set to true, use the first entry in the array and note this is a fallback in your reasoning, but still only cover that one.
- Ignore fields that are null. Do not invent a fact to fill a gap.
- Ground paragraph 2 specifically in the evidence field of the isBestMatch opportunity, not just its name or explanation. The evidence field exists precisely so the email can cite something concrete; if you're not pulling a real detail from it, you're writing a generic email with the company's name attached.

Signal quality check (do this before writing):
- Pick exactly ONE concrete signal to build the email around, not a list. If you find yourself writing "the X, the Y, and the Z" or otherwise stringing together multiple nouns from websiteFindings, stop: that is a category dump, not an observation, and it reads as generic even though the words are technically specific to this company.
- A real signal is something a reader would recognize as uniquely their own detail (a named tool, a specific job title in an open vacancy, a specific process mentioned in their own text). A weak signal is a broad category any similar business would also have (having a "contact page," running "events," having a "membership" model). If the strongest available signal is only a broad category, say less rather than dressing it up as more.
- Do not present an inference as an observed fact. "That usually means X" is a guess, not evidence, even when it's a reasonable guess. If the isBestMatch opportunity's evidence field itself is thin or generic, keep the email's claim as modest as the evidence actually is, rather than writing confidently past what was found. It is better to write a shorter, more tentative email than to overstate what the research actually shows.

Personalization:
Use the concrete facts above directly, in your own words. Do not water them down into vague statements that could apply to any company. A reader should be able to tell this was written specifically about their business, not a template with their name dropped in. One sharp, specific observation beats three generic ones.

Tone:
Write like a real person who did the research personally reaching out, not a corporate marketing team or a bot filling in a template. Sound natural: vary your sentence length, write the way someone would actually talk to a colleague, and avoid stiff, over-formal phrasing. Plain, everyday words. Active voice. Avoid overused AI marketing phrases such as "unlock," "elevate," "seamless," "game-changer," "in today's fast-paced world," "revolutionize," "dive into," "leverage," "supercharge," and "cutting-edge." Do not use the em dash character (—); use a period, comma, or a connecting word instead.

Length: the full body should be 90-140 words total, across 3-4 short paragraphs. If you find yourself writing a fifth paragraph or exceeding 140 words, cut detail rather than add it — pick the single strongest fact, not the most facts.

Fields:
- subject: the email subject line, about 40-60 characters. May reference the company's name or industry if it reads naturally, not spammy.
- preheader: inbox preview text, about 50-100 characters, adds a detail the subject didn't cover.
- heading: the main headline, one short sentence or phrase, states the point directly.
- body: plain HTML paragraphs, only using <p>, <strong>, <em>, and <a href="..."> tags — no markdown, no headings, no lists. Structure:
  1. One or two sentences introducing Arisoft and what it does, in plain terms.
  2. One paragraph blending what was noticed about this company (the single concrete signal chosen per the signal quality check above) directly into the isBestMatch automation opportunity. Do not separate "here's what we noticed" and "here's the opportunity" into two paragraphs; connect them into one grounded observation. Name the actual mechanism being automated (e.g. "confirmation emails," "signup forms," "dispatch updates," "quote replies") rather than a vague benefit ("streamline your workflow," "spend more time on what matters," "less back-and-forth"). A reader should be able to picture the specific thing that would change, not just feel reassured that something would improve.
  3. A short closing paragraph linking to the fuller breakdown/report Arisoft put together on this company, using the placeholder URL {{report_url}} inside an <a href="{{report_url}}"> tag (this will be replaced with the real link downstream; always use this exact placeholder, never invent a real-looking URL). Frame it as a forward-looking offer to share something useful, not as a reveal of research already done. Use phrasing like "here's the specific breakdown" or "I put a quick breakdown together, worth a look" rather than naming the report as something already built about them specifically ("the breakdown we put together for [Company]" reads closer to "we've been studying you" than "we're offering to help"). After the link, add one short, soft nudge inviting a reply or conversation if they want to talk it through, so the email doesn't end as a dead-end click with no path back to a conversation. Do not mention a call, meeting, or "15 minutes" unless the JSON or company context makes a call clearly the more natural next step.
  4. A sign-off, on its own line, using only a plain first name ("Ali") or first name plus a single warm word ("Thanks, Ali" or "Cheers, Ali"). Never use "Best regards," "Kind regards," "Sincerely," or any other formal closing; it clashes with the casual tone of the rest of the email and makes it read as corporate. Do not add a title, company name, or contact details here; assume a signature block with that information is appended separately below the generated body.
  Do not pad with extra detail to make the email feel more thorough. A tight email that reads in 15 seconds and names one true, specific thing is the goal. A long, comprehensive-feeling email is a failure here, even if every sentence is accurate.`;

// Appended only when the same generated content is about to be queued to
// more than one recipient at the company (general inbox + one or more
// found contacts, see src/lib/companyQueue/processing.ts) — without this,
// the model sometimes greets a specific person by name when contact data
// is available, which would be wrong for every other recipient it's also
// sent to.
const GENERIC_GREETING_INSTRUCTION = `

This exact email will be sent as-is to more than one person at this company (a general inbox plus one or more named contacts). Do not address anyone by name anywhere in the email, even if named contacts appear in the JSON — use a neutral opener like "Hi," or "Hi there," instead.`;

export interface GenerateOutreachEmailOptions {
  genericGreeting?: boolean;
}

// companyId is optional only for the Company Analyzer's pre-save preview
// flow (generate-company-email/route.ts), where a company may not exist in
// the database yet — everywhere else a real, saved company is always
// available and should be passed so the email links to that company's own
// report. When absent, the placeholder falls back to the marketing
// homepage rather than being left as a broken literal "{{report_url}}" in
// the sent email.
export async function generateOutreachEmail(
  analysis: CompanyAnalysis,
  companyId?: string,
  options?: GenerateOutreachEmailOptions,
): Promise<GeneratedEmailContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_COMPANY_EMAIL_MODEL || "gpt-4o";
  const systemPrompt = options?.genericGreeting ? SYSTEM_PROMPT + GENERIC_GREETING_INSTRUCTION : SYSTEM_PROMPT;

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 4096,
    response_format: {
      type: "json_schema",
      json_schema: { name: "email_content", strict: true, schema: GENERATED_EMAIL_SCHEMA },
    },
    messages: [
      { role: "system", content: systemPrompt },
      // researchBrief is the Research Agent's raw notes, kept only for
      // human debugging on the company detail page - the distilled fields
      // below already cover what this prompt needs, so it's excluded here
      // to keep this call's input lean.
      { role: "user", content: JSON.stringify({ ...analysis, researchBrief: undefined }) },
    ],
  });

  const message = response.choices[0]?.message;

  if (message?.refusal) {
    throw new Error("The AI declined to generate this email. Try again.");
  }

  if (!message?.content) {
    throw new Error("The AI did not return any content.");
  }

  const content = parseGeneratedEmailContent(message.content);
  const reportUrl = companyId ? await getOrCreateReportUrl(companyId) : getPublicSiteUrl();

  return { ...content, body: content.body.replaceAll(REPORT_URL_PLACEHOLDER, reportUrl) };
}
