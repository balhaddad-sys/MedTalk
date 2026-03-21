import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  buildMedicalVerificationNotes,
  summarizeTranscriptionLogprobs,
} from "@/lib/medicalSafety";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

// Language-specific medical vocabulary prompts to bias Whisper recognition.
// Only provided for the patient's language so Whisper doesn't hallucinate
// English words when transcribing Arabic, Hindi, etc.
const MEDICAL_PROMPTS: Record<string, string> = {
  en: "Patient symptoms: pain, nausea, vomiting, headache, fever, cough, shortness of breath, chest pain, dizziness, fatigue, medication, dosage, milligrams, allergies, blood pressure, diabetes, insulin, penicillin, ibuprofen, acetaminophen, aspirin, hypertension.",
  ar: "\u0623\u0639\u0631\u0627\u0636 \u0627\u0644\u0645\u0631\u064A\u0636: \u0623\u0644\u0645\u060C \u063A\u062B\u064A\u0627\u0646\u060C \u062A\u0642\u064A\u0624\u060C \u0635\u062F\u0627\u0639\u060C \u062D\u0631\u0627\u0631\u0629\u060C \u0633\u0639\u0627\u0644\u060C \u0636\u064A\u0642 \u062A\u0646\u0641\u0633\u060C \u0623\u0644\u0645 \u0641\u064A \u0627\u0644\u0635\u062F\u0631\u060C \u062F\u0648\u062E\u0629\u060C \u0625\u0631\u0647\u0627\u0642\u060C \u062F\u0648\u0627\u0621\u060C \u062C\u0631\u0639\u0629\u060C \u062D\u0633\u0627\u0633\u064A\u0629\u060C \u0636\u063A\u0637 \u062F\u0645\u060C \u0633\u0643\u0631\u064A\u060C \u0623\u0646\u0633\u0648\u0644\u064A\u0646\u060C \u0628\u0646\u0633\u0644\u064A\u0646.",
  hi: "\u092E\u0930\u0940\u091C\u093C \u0915\u0947 \u0932\u0915\u094D\u0937\u0923: \u0926\u0930\u094D\u0926, \u092E\u093F\u091A\u0932\u0940, \u0909\u0932\u094D\u091F\u0940, \u0938\u093F\u0930\u0926\u0930\u094D\u0926, \u092C\u0941\u0916\u093E\u0930, \u0916\u093E\u0902\u0938\u0940, \u0938\u093E\u0902\u0938 \u0915\u0940 \u0924\u0915\u0932\u0940\u092B, \u091B\u093E\u0924\u0940 \u092E\u0947\u0902 \u0926\u0930\u094D\u0926, \u091A\u0915\u094D\u0915\u0930, \u0925\u0915\u093E\u0928, \u0926\u0935\u093E\u0908, \u0916\u0941\u0930\u093E\u0915, \u090F\u0932\u0930\u094D\u091C\u0940, \u0930\u0915\u094D\u0924\u091A\u093E\u092A, \u092E\u0927\u0941\u092E\u0947\u0939.",
  ur: "\u0645\u0631\u06CC\u0636 \u06A9\u06CC \u0639\u0644\u0627\u0645\u0627\u062A: \u062F\u0631\u062F\u060C \u0645\u062A\u0644\u06CC\u060C \u0642\u06CC\u060C \u0633\u0631\u062F\u0631\u062F\u060C \u0628\u062E\u0627\u0631\u060C \u06A9\u06BE\u0627\u0646\u0633\u06CC\u060C \u0633\u0627\u0646\u0633 \u0645\u06CC\u06BA \u062A\u06A9\u0644\u06CC\u0641\u060C \u0633\u06CC\u0646\u06D2 \u0645\u06CC\u06BA \u062F\u0631\u062F\u060C \u0686\u06A9\u0631\u060C \u062A\u06BE\u06A9\u0627\u0648\u0679\u060C \u062F\u0648\u0627\u060C \u0627\u0644\u0631\u062C\u06CC\u060C \u0628\u0644\u0688 \u067E\u0631\u06CC\u0634\u0631\u060C \u0634\u0648\u06AF\u0631.",
  es: "S\u00edntomas del paciente: dolor, n\u00e1useas, v\u00f3mito, dolor de cabeza, fiebre, tos, dificultad para respirar, dolor en el pecho, mareo, fatiga, medicamento, dosis, miligramos, alergias, presi\u00f3n arterial, diabetes, insulina, penicilina.",
  fr: "Sympt\u00f4mes du patient: douleur, naus\u00e9e, vomissement, mal de t\u00eate, fi\u00e8vre, toux, essoufflement, douleur thoracique, \u00e9tourdissement, fatigue, m\u00e9dicament, dose, milligrammes, allergies, tension art\u00e9rielle, diab\u00e8te, insuline, p\u00e9nicilline.",
  de: "Symptome des Patienten: Schmerzen, \u00dcbelkeit, Erbrechen, Kopfschmerzen, Fieber, Husten, Atemnot, Brustschmerzen, Schwindel, M\u00fcdigkeit, Medikament, Dosierung, Milligramm, Allergien, Blutdruck, Diabetes, Insulin, Penicillin.",
  ru: "\u0421\u0438\u043C\u043F\u0442\u043E\u043C\u044B \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430: \u0431\u043E\u043B\u044C, \u0442\u043E\u0448\u043D\u043E\u0442\u0430, \u0440\u0432\u043E\u0442\u0430, \u0433\u043E\u043B\u043E\u0432\u043D\u0430\u044F \u0431\u043E\u043B\u044C, \u0436\u0430\u0440, \u043A\u0430\u0448\u0435\u043B\u044C, \u043E\u0434\u044B\u0448\u043A\u0430, \u0431\u043E\u043B\u044C \u0432 \u0433\u0440\u0443\u0434\u0438, \u0433\u043E\u043B\u043E\u0432\u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u0435, \u0443\u0441\u0442\u0430\u043B\u043E\u0441\u0442\u044C, \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u043E, \u0434\u043E\u0437\u0430, \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u044F, \u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435, \u0434\u0438\u0430\u0431\u0435\u0442, \u0438\u043D\u0441\u0443\u043B\u0438\u043D.",
  ko: "\uD658\uC790 \uC99D\uC0C1: \uD1B5\uC99D, \uBA54\uC2A4\uAEBC\uC6C0, \uAD6C\uD1A0, \uB450\uD1B5, \uBC1C\uC5F4, \uAE30\uCE68, \uD638\uD761\uACE4\uB780, \uD754\uD1B5, \uC5B4\uC9C0\uB7EC\uC6C0, \uD53C\uB85C, \uC57D\uBB3C, \uC6A9\uB7C9, \uC54C\uB808\uB974\uAE30, \uD608\uC555, \uB2F9\uB1E8, \uC778\uC2AC\uB9B0.",
  zh: "\u60A3\u8005\u75C7\u72B6\uFF1A\u75BC\u75DB\u3001\u6076\u5FC3\u3001\u5455\u5410\u3001\u5934\u75DB\u3001\u53D1\u70E7\u3001\u54B3\u55FD\u3001\u547C\u5438\u56F0\u96BE\u3001\u80F8\u75DB\u3001\u5934\u6655\u3001\u75B2\u52B3\u3001\u836F\u7269\u3001\u5242\u91CF\u3001\u8FC7\u654F\u3001\u8840\u538B\u3001\u7CD6\u5C3F\u75C5\u3001\u80F0\u5C9B\u7D20\u3001\u9752\u9709\u7D20.",
  ja: "\u60A3\u8005\u306E\u75C7\u72B6\uFF1A\u75DB\u307F\u3001\u5410\u304D\u6C17\u3001\u5614\u5410\u3001\u982D\u75DB\u3001\u767A\u71B1\u3001\u54B3\u3001\u606F\u5207\u308C\u3001\u80F8\u75DB\u3001\u3081\u307E\u3044\u3001\u75B2\u52B4\u3001\u85AC\u3001\u6295\u4E0E\u91CF\u3001\u30A2\u30EC\u30EB\u30AE\u30FC\u3001\u8840\u5727\u3001\u7CD6\u5C3F\u75C5\u3001\u30A4\u30F3\u30B9\u30EA\u30F3\u3001\u30DA\u30CB\u30B7\u30EA\u30F3.",
  tl: "Sintomas ng pasyente: sakit, pagduduwal, pagsusuka, sakit ng ulo, lagnat, ubo, hirap sa paghinga, sakit sa dibdib, pagkahilo, pagkapagod, gamot, dosis, alerdyi, presyon ng dugo, diyabetis, insulin.",
  fa: "\u0639\u0644\u0627\u0626\u0645 \u0628\u06CC\u0645\u0627\u0631: \u062F\u0631\u062F\u060C \u062D\u0627\u0644\u062A \u062A\u0647\u0648\u0639\u060C \u0627\u0633\u062A\u0641\u0631\u0627\u063A\u060C \u0633\u0631\u062F\u0631\u062F\u060C \u062A\u0628\u060C \u0633\u0631\u0641\u0647\u060C \u062A\u0646\u06AF\u06CC \u0646\u0641\u0633\u060C \u062F\u0631\u062F \u0642\u0641\u0633\u0647 \u0633\u06CC\u0646\u0647\u060C \u0633\u0631\u06AF\u06CC\u062C\u0647\u060C \u062E\u0633\u062A\u06AF\u06CC\u060C \u062F\u0627\u0631\u0648\u060C \u062F\u0648\u0632\u060C \u062D\u0633\u0627\u0633\u06CC\u062A\u060C \u0641\u0634\u0627\u0631 \u062E\u0648\u0646\u060C \u062F\u06CC\u0627\u0628\u062A\u060C \u0627\u0646\u0633\u0648\u0644\u06CC\u0646.",
};

// Map our app language codes to valid Whisper ISO 639-1 codes.
// Whisper only accepts 2-letter codes; codes like "zh-TW" need mapping.
const WHISPER_LANG_MAP: Record<string, string> = {
  "zh-TW": "zh",
  "pt-PT": "pt",
};

function getWhisperLangCode(code: string): string | undefined {
  if (WHISPER_LANG_MAP[code]) return WHISPER_LANG_MAP[code];
  // Only return 2-letter codes (Whisper requirement)
  if (code.length === 2) return code;
  return undefined;
}

// Map browser MIME types to Whisper-compatible extensions
function getWhisperFilename(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "audio.mp4";
  if (mimeType.includes("wav")) return "audio.wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "audio.mp3";
  if (mimeType.includes("ogg")) return "audio.ogg";
  if (mimeType.includes("flac")) return "audio.flac";
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

    // Resolve Whisper-compatible language code
    const whisperLang = languageHint ? getWhisperLangCode(languageHint) : undefined;

    // Pick the vocabulary prompt in the patient's language.
    // Falls back to no prompt if we don't have one — better than an
    // English prompt that would bias Whisper toward English words.
    const baseLang = whisperLang || (languageHint?.split("-")[0] ?? "");
    const vocabPrompt = MEDICAL_PROMPTS[baseLang] || undefined;

    const prompt =
      baseLang === "en"
        ? `Medical encounter. Preserve exact drug names, numbers, dosages, units, timing, laterality, and negations. ${vocabPrompt ?? ""}`.trim()
        : vocabPrompt;

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
      file: whisperFile,
      ...(prompt ? { prompt } : {}),
      ...(whisperLang ? { language: whisperLang } : {}),
      include: ["logprobs"],
      temperature: 0,
    });

    const quality = summarizeTranscriptionLogprobs(transcription.logprobs);
    const reviewItems =
      quality.confidence === "high"
        ? []
        : buildMedicalVerificationNotes(
            transcription.text,
            quality.confidence,
            quality.lowConfidenceTerms
          );

    return NextResponse.json({
      text: transcription.text,
      confidence: quality.confidence,
      low_confidence_terms: quality.lowConfidenceTerms,
      review_items: reviewItems,
      model: "gpt-4o-transcribe",
    });
  } catch (error: unknown) {
    console.error("STT error:", error);
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
