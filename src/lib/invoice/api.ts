import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { errorCode } from "./delivery";
import { InvoiceRejected } from "./request";
import { VatUndecidedError } from "./vatRates";

const MAX_AGE_SECONDS = 5 * 60;

export function invoiceSignature(secret: string, timestamp: string, method: string, path: string, body: string): string {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret).update(`${timestamp}\n${method}\n${path}\n${bodyHash}`).digest("hex");
}

export function isSignedRequest(request: Request, body: string, secret: string): boolean {
  const timestamp = request.headers.get("x-arisoft-timestamp") ?? "";
  const signature = request.headers.get("x-arisoft-signature") ?? "";
  if (!/^\d+$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) return false;
  const expected = invoiceSignature(secret, timestamp, request.method, new URL(request.url).pathname, body);
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

const answer = (status: number, error: string) => Response.json({ error }, { status });

/** The raw body is read before anything parses it, as the signature covers those exact bytes. */
export function invoiceRoute<Params>(handler: (body: string, params: Params) => Promise<Response>) {
  return async (request: Request, context: { params: Promise<Params> }): Promise<Response> => {
    try {
      // Our own misconfiguration is temporary: a 401 here would be final at HSM.
      const secret = process.env.ARISOFT_INVOICE_HMAC_SECRET;
      if (!secret) return answer(503, "Not configured.");
      const body = await request.text();
      if (!isSignedRequest(request, body, secret)) return answer(401, "Bad signature.");
      return await handler(body, await context.params);
    } catch (error) {
      if (error instanceof InvoiceRejected) return answer(error.status, error.message);
      if (error instanceof VatUndecidedError) return answer(503, error.message);
      console.error("[invoices]", errorCode(error));
      return answer(500, "Try again.");
    }
  };
}
