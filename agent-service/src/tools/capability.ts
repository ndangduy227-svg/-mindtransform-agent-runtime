/**
 * Capability preflight (QC §6.3 identity matrix — v1 subset).
 * Nodes ask "can I actually do this?" BEFORE attempting side effects.
 * Missing capability → node returns blocked (build brief §7), never fake success.
 */

export type CapabilityKey =
  | "lark_build"        // Lark CLI/MCP with app credential
  | "screenshot_live"   // Playwright/browser for live UI capture
  | "evidence_api_render" // render evidence from API data (needs lark read)
  | "publisher_cms"     // CMS service-account publish
  | "publisher_static_git"; // static git/Vercel deploy

export interface CapabilityResult {
  key: CapabilityKey;
  available: boolean;
  reason: string; // why available/unavailable — surfaced in UI blockers
}

export function checkCapability(key: CapabilityKey): CapabilityResult {
  switch (key) {
    case "lark_build": {
      const ok = !!(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET);
      return {
        key,
        available: ok,
        reason: ok
          ? "LARK_APP_ID/SECRET present"
          : "missing LARK_APP_ID / LARK_APP_SECRET (see LARK_CLI_SETUP_STATUS.md)",
      };
    }
    case "screenshot_live": {
      const ok = process.env.PLAYWRIGHT_AVAILABLE === "1";
      return { key, available: ok, reason: ok ? "playwright enabled" : "PLAYWRIGHT_AVAILABLE != 1" };
    }
    case "evidence_api_render": {
      // can render evidence from API data when we can at least read Lark
      const ok = !!(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET);
      return { key, available: ok, reason: ok ? "lark read available" : "no lark credential for api_render" };
    }
    case "publisher_cms": {
      const ok = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
      return { key, available: ok, reason: ok ? "Supabase CMS available" : "missing Supabase service credentials" };
    }
    case "publisher_static_git": {
      const ok = process.env.STATIC_PUBLISH_ENABLED === "1";
      return { key, available: ok, reason: ok ? "static git publisher enabled" : "STATIC_PUBLISH_ENABLED != 1" };
    }
  }
}

export function preflight(keys: CapabilityKey[]): CapabilityResult[] {
  return keys.map(checkCapability);
}
