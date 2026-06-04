import { NextResponse } from "next/server";

const providers = [
  {
    id: "groq",
    name: "Groq",
    envKey: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiStyle: "openai-compatible-chat",
    defaultModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  {
    id: "gemini",
    name: "Gemini",
    envKey: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    apiStyle: "gemini-generate-content",
    defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  {
    id: "anthropic",
    name: "Claude",
    envKey: "ANTHROPIC_API_KEY",
    endpoint: "https://api.anthropic.com/v1/messages",
    apiStyle: "anthropic-messages",
    defaultModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  },
  {
    id: "openai",
    name: "ChatGPT / OpenAI",
    envKey: "OPENAI_API_KEY",
    endpoint: "https://api.openai.com/v1/responses",
    apiStyle: "openai-responses",
    defaultModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  },
  {
    id: "openrouter",
    name: "9Router / OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiStyle: "openai-compatible-chat",
    defaultModel: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
  },
];

export function GET() {
  return NextResponse.json({
    providers: providers.map((provider) => ({
      ...provider,
      configured: Boolean(process.env[provider.envKey]),
    })),
  });
}
