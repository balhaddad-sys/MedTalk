import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
