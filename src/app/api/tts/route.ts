import { NextResponse } from "next/server";

// TTS is handled client-side via browser SpeechSynthesis API (free, no API key needed).
// This route exists only as a fallback stub.
export async function POST() {
  return NextResponse.json(
    { error: "TTS is handled client-side via browser SpeechSynthesis" },
    { status: 410 }
  );
}
