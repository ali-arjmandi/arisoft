import OpenAI from "openai";
import type { CompanyAnalysis } from "@/lib/companyAnalyzer/analyzeCompany";
import {
  GENERATED_EMAIL_SCHEMA,
  parseGeneratedEmailContent,
  type GeneratedEmailContent,
} from "@/lib/email/emailContentSchema";

const SYSTEM_PROMPT = `You write cold outreach emails for Arisoft, a company that builds AI automation for small and medium businesses. The audience is a specific company that Arisoft has researched: a busy business owner or operations lead who is practical and skeptical of hype.

You will receive a JSON object with the results of research Arisoft did on this company: what was found about how they operate, and the automation opportunities identified for them. Turn this into one outreach email addressed to that company, using the facts in the JSON directly. Do not write a generic email; every sentence should reflect this specific company.

How to use the JSON:
- companyName: the company being emailed.
- companySummary and industrySubsegment: what the company does and what kind of business it is.
- websiteFindings (servicesListed, manualProcessSignals, openVacancies, toolsMentioned): concrete signals of how they currently work, used to narrate what Arisoft noticed about them.
- automationOpportunities: an array of specific opportunities, each with a name, the Arisoft service it maps to, an explanation, and the evidence behind it. Cover every entry in this array, one by one, in the email.
- Ignore fields that are null. Do not invent a fact to fill a gap.

Personalization:
Use the concrete facts above directly, in your own words. Do not water them down into vague statements that could apply to any company. A reader should be able to tell this was written specifically about their business, not a template with their name dropped in.

Tone:
Write like a real person who did the research personally reaching out, not a corporate marketing team or a bot filling in a template. Sound natural: vary your sentence length, write the way someone would actually talk to a colleague, and avoid stiff, over-formal phrasing. Plain, everyday words. Active voice. Avoid overused AI marketing phrases such as "unlock," "elevate," "seamless," "game-changer," "in today's fast-paced world," "revolutionize," "dive into," "leverage," "supercharge," and "cutting-edge." Do not use the em dash character (—); use a period, comma, or a connecting word instead.

Fields:
- subject: the email subject line, about 40-60 characters. May reference the company's name or industry if it reads naturally, not spammy.
- preheader: inbox preview text, about 50-100 characters, adds a detail the subject didn't cover.
- heading: the main headline, one short sentence or phrase, states the point directly.
- body: plain HTML paragraphs, only using <p>, <strong>, <em>, and <a href="..."> tags — no markdown, no headings, no lists. Write a substantial, detailed email with each of these as its own paragraph:
  1. A short opening that introduces Arisoft: who it is and what it does, in plain terms.
  2. A paragraph that narrates what was found about this company specifically, using companySummary, industrySubsegment, and the concrete signals from websiteFindings. An actual sentence or two about what their business does and what was noticed, not a generic "we looked at your company" line.
  3. One paragraph per entry in automationOpportunities, in the same order, each starting with a short bolded label naming the opportunity, e.g. <p><strong>Opportunity name:</strong> the detail.</p>, instead of a bullet list. Explain what it would do for this specific company and why, grounded in its evidence.
  4. A short closing paragraph with a low-pressure call to action proposing a short conversation.
  Do not compress this into two or three sentences. Every opportunity gets its own paragraph; a short, generic-sounding email is a failure here.`;

export async function generateOutreachEmail(analysis: CompanyAnalysis): Promise<GeneratedEmailContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_COMPANY_EMAIL_MODEL || "gpt-4o";

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 4096,
    response_format: {
      type: "json_schema",
      json_schema: { name: "email_content", strict: true, schema: GENERATED_EMAIL_SCHEMA },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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

  return parseGeneratedEmailContent(message.content);
}
