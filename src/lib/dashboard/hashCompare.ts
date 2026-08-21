export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Compares two secrets by hashing both sides first, so a shorter/longer
// mismatch doesn't short-circuit string comparison in a way that leaks
// timing information about how much of the secret matched.
export async function hashesMatch(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  return digestA === digestB;
}
