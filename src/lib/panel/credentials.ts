import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.PANEL_USERNAME;
  const expectedPassword = process.env.PANEL_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;

  const usernameMatches = timingSafeEqual(digest(username), digest(expectedUsername));
  const passwordMatches = timingSafeEqual(digest(password), digest(expectedPassword));
  return usernameMatches && passwordMatches;
}
