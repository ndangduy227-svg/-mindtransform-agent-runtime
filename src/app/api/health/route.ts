import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "mindtransform-agent-runtime",
    version: "0.1.0",
    persistence: "mock",
  });
}
