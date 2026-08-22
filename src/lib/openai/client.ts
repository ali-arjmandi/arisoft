import OpenAI from "openai";

const DEFAULT_MAX_RETRIES = 3;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI generation is not configured.");
  }
  const maxRetries = Number(process.env.OPENAI_MAX_RETRIES) || DEFAULT_MAX_RETRIES;
  return new OpenAI({ apiKey, maxRetries });
}
