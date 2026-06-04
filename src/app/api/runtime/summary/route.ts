import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    runtime: "Mind Agent Center",
    status: "prototype_v0",
    firstProof: "website_mindai_to_proposal_seed",
    modules: [
      "config_studio",
      "llm_model_router",
      "agent_tooling",
      "agent_registry",
      "workflow_registry",
      "session_inbox",
      "memory_control",
      "runtime_database",
      "cost_eval",
    ],
    persistence: {
      current: "mock_data",
      next: "supabase_postgres",
      requiresSupabaseProject: true,
    },
  });
}
