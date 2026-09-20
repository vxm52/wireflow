import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Abuse guards for the public demo. Every call to /api/generate costs real
 * money, so these run before the vision call.
 *
 * All helpers here FAIL OPEN: if Redis is unreachable we log and allow the
 * request rather than take the demo down. The Anthropic spend cap is the hard
 * backstop.
 */

const DAILY_MAX = Number(process.env.DAILY_MAX ?? 100);
const DAY_KEY_TTL_SECONDS = 48 * 60 * 60;

// A limiter outage must not add noticeable latency: cap the client's retries
// and give each guard a hard deadline before failing open.
const GUARD_TIMEOUT_MS = 1500;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${GUARD_TIMEOUT_MS}ms`)), GUARD_TIMEOUT_MS),
    ),
  ]);
}

// Redis.fromEnv() throws when the env vars are missing, so the client is
// created lazily and any failure is handled by the fail-open callers.
let redis: Redis | null = null;
let ipLimit: Ratelimit | null = null;

function getRedis(): Redis {
  redis ??= Redis.fromEnv({ retry: { retries: 1, backoff: () => 100 } });
  return redis;
}

function getIpLimit(): Ratelimit {
  ipLimit ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "wf:ip",
    analytics: false,
  });
  return ipLimit;
}

/** On Vercel the left-most x-forwarded-for entry is the real client. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

/** 10 generations per IP per rolling hour. */
export async function checkIpLimit(ip: string): Promise<GuardResult> {
  try {
    const { success } = await withTimeout(getIpLimit().limit(ip));
    return success
      ? { allowed: true }
      : { allowed: false, reason: "Rate limit reached — give it a minute and try again." };
  } catch (err) {
    console.error("[ratelimit] IP limiter unavailable, failing open:", describe(err));
    return { allowed: true };
  }
}

/**
 * Global circuit breaker: at most DAILY_MAX generations per calendar day
 * (UTC). The key expires after 48h so old days clean themselves up.
 */
export async function checkDailyBudget(): Promise<GuardResult> {
  const key = `wf:day:${new Date().toISOString().slice(0, 10)}`;
  try {
    const used = await withTimeout(getRedis().incr(key));
    if (used === 1) await withTimeout(getRedis().expire(key, DAY_KEY_TTL_SECONDS));
    if (used > DAILY_MAX) {
      console.warn(`[ratelimit] daily budget exhausted: ${used - 1}/${DAILY_MAX}`);
      return { allowed: false, reason: "The demo hit today's limit — check back tomorrow." };
    }
    return { allowed: true };
  } catch (err) {
    console.error("[ratelimit] daily counter unavailable, failing open:", describe(err));
    return { allowed: true };
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
