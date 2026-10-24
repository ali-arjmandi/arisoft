import type { runEmailSendTick as RunEmailSendTick } from "@/lib/email/publishTick";
import type { runQueueTick as RunQueueTick } from "@/lib/companyQueue/processing";

declare global {
  var __devTickLoopStarted: boolean | undefined;
}

// How often the dev-only loop re-checks queue/email-send state, once the
// previous pair of ticks has fully settled. A fixed code constant, not an
// env var: this is dev-only convenience tooling, not a production-pacing
// knob like QUEUE_BATCH_SIZE/EMAIL_SEND_*.
const DEV_TICK_INTERVAL_MS = 5000;

let lastQueueRunning = false;
let lastEmailRunning = false;

async function safeRunQueueTick(runQueueTick: typeof RunQueueTick) {
  try {
    return await runQueueTick();
  } catch (error) {
    console.error("[dev-tick] runQueueTick threw unexpectedly:", error);
    return null;
  }
}

async function safeRunEmailSendTick(runEmailSendTick: typeof RunEmailSendTick) {
  try {
    return await runEmailSendTick();
  } catch (error) {
    console.error("[dev-tick] runEmailSendTick threw unexpectedly:", error);
    return null;
  }
}

async function startDevTickLoop(): Promise<void> {
  // Dynamically imported rather than a static top-level import: Next.js
  // bundles instrumentation.ts for both the Node.js and Edge runtime, and a
  // static import would pull this chain's drizzle-orm/node-postgres -> pg
  // dependency into a hypothetical Edge bundle regardless of the
  // NEXT_RUNTIME check in register() below.
  const { runQueueTick } = await import("@/lib/companyQueue/processing");
  const { runEmailSendTick } = await import("@/lib/email/publishTick");

  // setTimeout-based self-rescheduling, not setInterval: the next pair of
  // ticks is only scheduled once the current pair has fully settled, so a
  // slow tick (a company research call can take up to ~1 minute) can never
  // overlap with the next one.
  async function tick(): Promise<void> {
    const [queueResult, emailResult] = await Promise.all([
      safeRunQueueTick(runQueueTick),
      safeRunEmailSendTick(runEmailSendTick),
    ]);

    // Log only on isRunning transitions (Start/Stop clicked on the
    // dashboard) — most ticks are cheap no-ops and logging those every few
    // seconds would spam the terminal for no benefit. Per-item activity is
    // already visible via the existing OpenAI usage logs and the
    // dashboard's own status columns.
    if (queueResult && queueResult.isRunning !== lastQueueRunning) {
      lastQueueRunning = queueResult.isRunning;
      console.log(`[dev-tick] company queue ${lastQueueRunning ? "started" : "stopped"}.`);
    }
    if (emailResult && emailResult.isRunning !== lastEmailRunning) {
      lastEmailRunning = emailResult.isRunning;
      console.log(`[dev-tick] email send ${lastEmailRunning ? "started" : "stopped"}.`);
    }

    setTimeout(() => {
      void tick();
    }, DEV_TICK_INTERVAL_MS);
  }

  void tick();
}

// Replaces, for local dev only, the external scheduler that hits
// /api/cron/tick in production (AWS EventBridge -> Amplify Lambda) — a dev
// machine has no reachable EventBridge, and isn't Lambda-time-limited, so an
// in-process loop can call the same tick functions directly instead. Gated
// on APP_ENV=development (see .env.example) so this can never activate on
// Amplify, where APP_ENV is intentionally left unset.
export function register(): void {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.APP_ENV !== "development") return;

  // Belt-and-suspenders idempotency guard, mirroring db/client.ts's
  // globalThis.__dashboardDbPool pattern — register() is documented as
  // called exactly once per server instance, but this guarantees a second
  // invocation (e.g. from editing this file while `next dev` runs) can't
  // start a second concurrent loop.
  if (globalThis.__devTickLoopStarted) return;
  globalThis.__devTickLoopStarted = true;

  console.log(`[dev-tick] APP_ENV=development — starting background queue/email tick loop (every ${DEV_TICK_INTERVAL_MS}ms).`);
  void startDevTickLoop();
}
