export const SESSION_COOKIE_NAME = "panel_session";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifySessionCookie(value: string | undefined | null): Promise<boolean> {
  const expected = process.env.PANEL_SESSION_TOKEN;
  if (!value || !expected) return false;

  const [actualDigest, expectedDigest] = await Promise.all([sha256Hex(value), sha256Hex(expected)]);
  return actualDigest === expectedDigest;
}
