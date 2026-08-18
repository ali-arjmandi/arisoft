export const CONTENT_FIELDS = [
  "subject",
  "preheader",
  "eyebrow",
  "heading",
  "body",
  "ctaLabel",
  "ctaUrl",
  "unsubscribeUrl",
] as const;

export type ContentFieldName = (typeof CONTENT_FIELDS)[number];
export type EmailContent = Record<ContentFieldName, string>;

export const content: EmailContent = {
  subject: "Less busywork, more business.",

  preheader: "A practical way to cut busywork out of your week.",

  eyebrow: "AI automation for SMEs",

  heading: "Less busywork, more business.",

  body:
    "We help Dutch SMEs automate the repetitive work eating into their week &mdash; support replies, data entry, follow-ups, reporting &mdash; by connecting the tools you already use. No generic chatbot: automation shaped around how your team actually works, live in weeks, not months.",

  ctaLabel: "Get in touch",
  
  ctaUrl: "https://arisoft.nl/#contact",

  unsubscribeUrl: "mailto:info@arisoft.nl?subject=Unsubscribe",
};
