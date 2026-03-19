import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

const MEDICAL_VOCABULARY_PROMPT =
  "Patient symptoms: pain, nausea, vomiting, headache, fever, cough, shortness of breath, " +
  "chest pain, dizziness, fatigue, medication, dosage, milligrams, allergies, blood pressure, " +
  "diabetes, insulin, penicillin, ibuprofen, acetaminophen, aspirin, hypertension, " +
  "tachycardia, bradycardia, oxygen saturation, temperature, pulse, respiratory rate";

// Map browser MIME types to Whisper-compatible extensions
function getWhisperFilename(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "audio.mp4";
  if (mimeType.includes("wav")) return "audio.wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "audio.mp3";
  if (mimeType.includes("ogg")) return "audio.ogg";
  if (mimeType.includes("flac")) return "audio.flac";
  // webm (most common from browsers) - Whisper accepts it
  return "audio.webm";
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, "stt");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("file") as File;
    const languageHint = formData.get("language") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // File size validation
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Audio file exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const openai = getOpenAI();

    // Convert to a proper File with Whisper-compatible filename
    const filename = getWhisperFilename(audioFile.type || "");
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const whisperFile = new File([buffer], filename, {
      type: audioFile.type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: whisperFile,
      prompt: MEDICAL_VOCABULARY_PROMPT,
      ...(languageHint && languageHint.length === 2
        ? { language: languageHint }
        : {}),
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    console.error("STT error:", error);
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
