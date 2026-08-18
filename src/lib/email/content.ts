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
  subject: "",

  preheader: "",

  eyebrow: "AI automation for SMEs",

  heading: "",

  body: "",

  ctaLabel: "Get in touch",

  ctaUrl: "https://arisoft.nl/#contact",

  unsubscribeUrl: "mailto:info@arisoft.nl?subject=Unsubscribe",
};
