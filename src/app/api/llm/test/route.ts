import { NextRequest, NextResponse } from "next/server";

type ProviderId = "groq" | "gemini" | "anthropic" | "openai" | "openrouter";

type TestPayload = {
  provider?: ProviderId;
  model?: string;
  prompt?: string;
  dryRun?: boolean;
};

const providerConfig = {
  groq: {
    envKey: "GROQ_API_KEY",
    defaultModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  gemini: {
    envKey: "GEMINI_API_KEY",
    defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  anthropic: {
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  },
  openai: {
    envKey: "OPENAI_API_KEY",
    defaultModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  },
  openrouter: {
    envKey: "OPENROUTER_API_KEY",
    defaultModel: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
  },
} satisfies Record<ProviderId, { envKey: string; defaultModel: string }>;

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as TestPayload;
  const provider = payload.provider || "groq";
  const config = providerConfig[provider];

  if (!config) {
    return NextResponse.json({ ok: false, error: "Unsupported provider" }, { status: 400 });
  }

  const apiKey = process.env[config.envKey];
  const model = payload.model || config.defaultModel;
  const prompt = payload.prompt || "Return one short sentence confirming the Mindtransform Agent Runtime model route works.";

  if (payload.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      provider,
      model,
      envKey: config.envKey,
      configured: Boolean(apiKey),
    });
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        provider,
        model,
        missingEnv: config.envKey,
        message: `Set ${config.envKey} in local .env.local or Vercel env before making a real provider call.`,
      },
      { status: 412 },
    );
  }

  try {
    const result = await callProvider(provider, apiKey, model, prompt);
    return NextResponse.json({
      ok: true,
      provider,
      model,
      output: result.output,
      rawProviderStatus: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider,
        model,
        error: error instanceof Error ? error.message : "Unknown provider error",
      },
      { status: 502 },
    );
  }
}

async function callProvider(provider: ProviderId, apiKey: string, model: string, prompt: string) {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: prompt }),
    });
    const json = await response.json();
    assertOk(response, json);
    return { status: response.status, output: json.output_text || JSON.stringify(json.output?.[0] || json).slice(0, 400) };
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 160,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const json = await response.json();
    assertOk(response, json);
    return { status: response.status, output: json.content?.[0]?.text || JSON.stringify(json).slice(0, 400) };
  }

  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const json = await response.json();
    assertOk(response, json);
    return { status: response.status, output: json.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(json).slice(0, 400) };
  }

  const baseUrl =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(provider === "openrouter"
        ? {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "Mindtransform Agent Runtime",
          }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 160,
    }),
  });
  const json = await response.json();
  assertOk(response, json);
  return { status: response.status, output: json.choices?.[0]?.message?.content || JSON.stringify(json).slice(0, 400) };
}

function assertOk(response: Response, json: unknown) {
  if (!response.ok) {
    throw new Error(JSON.stringify(json).slice(0, 600));
  }
}
