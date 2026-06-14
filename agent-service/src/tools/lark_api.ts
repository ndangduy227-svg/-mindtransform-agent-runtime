/**
 * Lark Open API client — tenant token caching + rate-limit handling.
 * Lessons from the Ô Tô Hợp Nhất case (QC §6.2) baked in:
 *   - 429/"limited" → wait then retry once; callers fall back to single-writes
 *   - tolerant response handling (never assume clean JSON shape)
 */

const DOMAIN = process.env.LARK_DOMAIN || "https://open.larksuite.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

interface TenantTokenResponse {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
}

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
  const d = (await res.json()) as TenantTokenResponse;
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

export interface LarkResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

function retryDelay(res: Response, attempt: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return Math.min(4000, 500 * 2 ** attempt);
}

/** Authenticated request with bounded retries and token refresh. */
export async function larkFetch<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown,
): Promise<LarkResponse<T>> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await getTenantToken();
    const res = await fetch(`${DOMAIN}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const raw = await res.text();
    let data: LarkResponse<T>;
    try {
      data = JSON.parse(raw) as LarkResponse<T>;
    } catch {
      throw new Error(`lark ${method} ${path} returned non-JSON HTTP ${res.status}: ${raw.slice(0, 240)}`);
    }

    if ((res.status === 401 || res.status === 403) && attempt === 0) {
      cachedToken = null;
      continue;
    }
    if ((res.status === 429 || /limit|too many/i.test(data.msg ?? "")) && attempt < 2) {
      await sleep(retryDelay(res, attempt));
      continue;
    }
    if (!res.ok && data.code === 0) {
      throw new Error(`lark ${method} ${path} failed with HTTP ${res.status}`);
    }
    return data;
  }
  throw new Error(`lark ${method} ${path} exhausted retries`);
}

export const LARK_DOMAIN = DOMAIN;
export { sleep };
