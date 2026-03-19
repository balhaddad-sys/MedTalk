import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)
const ALLOWED_AUDIO_TYPES = [
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav",
  "audio/ogg", "audio/flac", "audio/m4a", "audio/x-m4a",
  "video/webm", // some browsers report webm audio as video/webm
];

const MEDICAL_VOCABULARY_PROMPT =
  "Patient symptoms: pain, nausea, vomiting, headache, fever, cough, shortness of breath, " +
  "chest pain, dizziness, fatigue, medication, dosage, milligrams, allergies, blood pressure, " +
  "diabetes, insulin, penicillin, ibuprofen, acetaminophen, aspirin, hypertension, " +
  "tachycardia, bradycardia, oxygen saturation, temperature, pulse, respiratory rate";

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

    // MIME type validation (permissive — browsers report many different types)
    if (audioFile.type && !audioFile.type.startsWith("audio/") && !audioFile.type.startsWith("video/")) {
      return NextResponse.json(
        { error: `Invalid audio file type: ${audioFile.type}` },
        { status: 400 }
      );
    }

    const openai = getOpenAI();

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      prompt: MEDICAL_VOCABULARY_PROMPT,
      ...(languageHint && languageHint.length === 2 ? { language: languageHint } : {}),
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: unknown) {
    console.error("STT error:", error);
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
