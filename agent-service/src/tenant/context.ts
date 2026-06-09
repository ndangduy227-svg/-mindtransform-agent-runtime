/**
 * Tenant context — single-tenant now (Mind = tenant_0), Phase-3-ready.
 * Every memory query + tool call + model log MUST carry tenant_id.
 */
export interface TenantContext {
  tenantId: string;
  costCapUsdDaily: number;
  maxIterations: number;
}

export function resolveTenant(tenantIdFromReq?: string): TenantContext {
  return {
    tenantId: tenantIdFromReq ?? process.env.DEFAULT_TENANT_ID ?? "tenant_0",
    costCapUsdDaily: Number(process.env.COST_CAP_USD_DAILY ?? 5),
    maxIterations: Number(process.env.MAX_ITERATIONS ?? 3),
  };
}
