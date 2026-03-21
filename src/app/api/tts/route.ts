import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_TEXT_LENGTH = 4096;
type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
const VALID_VOICES: Voice[] = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

// Best voice per language family for consistent, natural-sounding output.
// "nova" is the most natural female voice for most languages.
// "onyx" is the best male voice for Arabic/Urdu/Farsi (deeper, clearer for RTL).
// "shimmer" works well for East Asian languages.
const VOICE_MAP: Record<string, Voice> = {
  ar: "onyx",    // Arabic — deeper voice, clearer for formal MSA
  ur: "onyx",    // Urdu
  fa: "onyx",    // Farsi
  he: "onyx",    // Hebrew
  ku: "onyx",    // Kurdish
  hi: "nova",    // Hindi
  bn: "nova",    // Bengali
  ta: "nova",    // Tamil
  te: "nova",    // Telugu
  ml: "nova",    // Malayalam
  ne: "nova",    // Nepali
  si: "nova",    // Sinhala
  en: "nova",    // English
  es: "nova",    // Spanish
  fr: "nova",    // French
  de: "alloy",   // German
  it: "nova",    // Italian
  pt: "nova",    // Portuguese
  ru: "nova",    // Russian
  uk: "nova",    // Ukrainian
  pl: "nova",    // Polish
  tr: "nova",    // Turkish
  zh: "shimmer", // Chinese (Simplified)
  "zh-TW": "shimmer", // Chinese (Traditional)
  ja: "shimmer", // Japanese
  ko: "shimmer", // Korean
  vi: "nova",    // Vietnamese
  th: "nova",    // Thai
  tl: "nova",    // Filipino
  so: "echo",    // Somali
  sw: "echo",    // Swahili
  am: "echo",    // Amharic
  my: "nova",    // Burmese
  ht: "nova",    // Haitian Creole
};

function pickVoice(lang?: string, requestedVoice?: string): Voice {
  if (requestedVoice && VALID_VOICES.includes(requestedVoice as Voice)) {
    return requestedVoice as Voice;
  }
  if (lang) {
    return VOICE_MAP[lang] || VOICE_MAP[lang.split("-")[0]] || "nova";
  }
  return "nova";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, "tts");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
      );
    }

    const { text, voice, lang } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const selectedVoice = pickVoice(lang, voice);

    const openai = getOpenAI();
    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: selectedVoice,
      input: text,
      response_format: "mp3",
      speed: 1.0,
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "TTS failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
