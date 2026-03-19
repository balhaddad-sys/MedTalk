import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { text, voice = "nova" } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "TTS failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
