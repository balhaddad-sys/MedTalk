import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    },
    engines: {
      translation: "openai",
      interview: "openai",
      summarize: "openai",
    },
  };

  const allGood = checks.env.openai;

  return NextResponse.json(checks, {
    status: allGood ? 200 : 503,
  });
}
