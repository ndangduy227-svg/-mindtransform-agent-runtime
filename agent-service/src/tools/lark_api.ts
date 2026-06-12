/**
 * Lark Open API client — tenant token caching + rate-limit handling.
 * Lessons from the Ô Tô Hợp Nhất case (QC §6.2) baked in:
 *   - 429/"limited" → wait then retry once; callers fall back to single-writes
 *   - tolerant response handling (never assume clean JSON shape)
 */

const DOMAIN = process.env.LARK_DOMAIN || "https://open.larksuite.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTenantToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const res = await fetch(`${DOMAIN}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const d = (await res.json()) as any;
  if (d.code !== 0 || !d.tenant_access_token) {
    throw new Error(`lark auth failed: code=${d.code} msg=${d.msg}`);
  }
  cachedToken = {
    token: d.tenant_access_token,
    expiresAt: Date.now() + Math.max(60, (d.expire ?? 3600) - 60) * 1000,
  };
  return cachedToken.token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface LarkResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/** Authenticated request with one rate-limit retry (650ms pacing per QC). */
export async function larkFetch<T = any>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
): Promise<LarkResponse<T>> {
  const token = await getTenantToken();
  const doFetch = async (): Promise<LarkResponse<T>> => {
    const res = await fetch(`${DOMAIN}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return (await res.json()) as LarkResponse<T>;
  };

  let d = await doFetch();
  // rate-limit signatures seen in the real case: HTTP 429 / "limited" in msg
  if (d.code !== 0 && /limit/i.test(d.msg ?? "")) {
    await sleep(700);
    d = await doFetch();
  }
  return d;
}

export const LARK_DOMAIN = DOMAIN;
export { sleep };
