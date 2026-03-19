import { NextRequest, NextResponse } from "next/server";
import { getGenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { detectPromptInjection, sanitizeUserInput, validateTranslationOutput, detectEmergency } from "@/lib/security";

const MAX_TEXT_LENGTH = 2000;

// Map language codes to full human-readable names for the prompt
const LANG_NAMES: Record<string, string> = {
  ar: "Arabic", en: "English", hi: "Hindi", ur: "Urdu", bn: "Bengali",
  ml: "Malayalam", ta: "Tamil", te: "Telugu", ne: "Nepali", si: "Sinhala",
  tl: "Tagalog", fa: "Farsi (Persian)", ku: "Kurdish (Sorani)", tr: "Turkish",
  he: "Hebrew", am: "Amharic", sw: "Swahili", so: "Somali", fr: "French",
  es: "Spanish", de: "German", ru: "Russian", uk: "Ukrainian", it: "Italian",
  pl: "Polish", pt: "Portuguese (Brazilian)", zh: "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)", ja: "Japanese", ko: "Korean",
  vi: "Vietnamese", th: "Thai", my: "Burmese", ht: "Haitian Creole",
};

// Language-specific translation instructions keyed by language code
const LANG_INSTRUCTIONS: Record<string, string> = {
  ar: "Use Modern Standard Arabic (\u0641\u0635\u062D\u0649) for medical terminology. Ensure proper RTL formatting. Use formal register.",
  ur: "Use formal Urdu with medical terminology in Urdu script. Preserve drug names in Latin script parenthetically if needed.",
  hi: "Use formal Hindi (\u0936\u0941\u0926\u094D\u0927 \u0939\u093F\u0928\u094D\u0926\u0940). Address patient respectfully with \u0906\u092A.",
  bn: "Use formal Bangla (\u09B6\u09C1\u09A6\u09CD\u09A7 \u09AC\u09BE\u0982\u09B2\u09BE). Maintain respectful forms (\u0986\u09AA\u09A8\u09BF).",
  ml: "Use formal Malayalam. Maintain respectful forms (\u0D28\u0D3F\u0D19\u0D4D\u0D19\u0D33\u0D4D/\u0D24\u0D3E\u0D19\u0D4D\u0D15\u0D33\u0D4D).",
  ta: "Use formal Tamil. Use respectful forms (\u0BA8\u0BC0\u0B99\u0BCD\u0B95\u0BB3\u0BCD).",
  te: "Use formal Telugu. Use respectful forms (\u0C2E\u0C40\u0C30\u0C41).",
  ne: "Use formal Nepali with Devanagari script. Use respectful forms (\u0924\u092A\u093E\u0908\u0902).",
  si: "Use formal Sinhala. Maintain respectful forms.",
  fa: "Use formal Farsi (\u0641\u0627\u0631\u0633\u06CC \u0631\u0633\u0645\u06CC). Use Persian medical terminology. Ensure proper RTL formatting.",
  ku: "Use Sorani Kurdish with Arabic script. Ensure proper RTL formatting.",
  he: "Use formal Modern Hebrew. Ensure proper RTL formatting.",
  tr: "Use formal Turkish. Address patient with formal 'siz' form.",
  es: "Use formal Spanish with 'usted' form (not 'tu'). Use Latin American medical terminology.",
  fr: "Use formal French with 'vous' form.",
  de: "Use formal German with 'Sie' form.",
  ru: "Use formal Russian with '\u0412\u044B' form.",
  uk: "Use formal Ukrainian with '\u0412\u0438' form.",
  it: "Use formal Italian with 'Lei' form.",
  pl: "Use formal Polish with 'Pan/Pani' forms.",
  pt: "Use Brazilian Portuguese with formal 'o senhor/a senhora' forms.",
  ko: "Use formal Korean with \uC874\uB313\uB9D0 (honorific speech level).",
  ja: "Use formal Japanese with \u656C\u8A9E (keigo/polite forms).",
  zh: "Use Simplified Chinese with standard medical terminology (\u533B\u5B66\u672F\u8BED).",
  "zh-TW": "Use Traditional Chinese with standard medical terminology (\u91AB\u5B78\u8853\u8A9E).",
  vi: "Use formal Vietnamese. Address patient respectfully.",
  th: "Use formal Thai with \u0E04\u0E23\u0E31\u0E1A/\u0E04\u0E48\u0E30 polite particles.",
  tl: "Use formal Tagalog/Filipino. Use 'po' and 'opo' for respect.",
  so: "Use standard Somali with formal register.",
  sw: "Use standard Swahili (Kiswahili sanifu) with formal register.",
  am: "Use formal Amharic with Ge'ez script.",
  my: "Use formal Burmese with standard medical terminology.",
  ht: "Use standard Haitian Creole. Keep medical terms clear and simple.",
  en: "Use clear, simple medical English. Avoid jargon where a plain word works.",
};

function resolveName(code: string): string {
  return LANG_NAMES[code] || LANG_NAMES[code.split("-")[0]] || code;
}

function buildPrompt(cleanText: string, sourceCode: string | undefined, targetCode: string): string {
  const sourceName = sourceCode ? resolveName(sourceCode) : null;
  const targetName = resolveName(targetCode);

  const sourceInstruction = sourceName
    ? `from ${sourceName}`
    : "(auto-detect the source language)";

  // Gather language-specific instructions
  const targetRules = LANG_INSTRUCTIONS[targetCode] || LANG_INSTRUCTIONS[targetCode.split("-")[0]] || "";
  const sourceRules = sourceCode
    ? LANG_INSTRUCTIONS[sourceCode] || LANG_INSTRUCTIONS[sourceCode.split("-")[0]] || ""
    : "";

  let langSection = "";
  if (targetRules) {
    langSection += `\nTARGET LANGUAGE (${targetName}) RULES:\n${targetRules}\n`;
  }
  if (sourceRules && sourceCode !== targetCode) {
    langSection += `\nSOURCE LANGUAGE (${sourceName}) CONTEXT:\n${sourceRules}\n`;
  }

  return `You are a certified medical interpreter specializing in ${sourceName || "multilingual"} to ${targetName} healthcare translation.

RULES:
1. Preserve ALL medical terminology exactly (drug names, dosages, units, anatomical terms)
2. Use the formal/polite register appropriate for clinical settings in ${targetName}
3. Never omit, add, or interpret information — translate exactly what was said
4. For ambiguous terms, prefer the medical interpretation
5. Preserve numbers, dates, and measurements exactly as stated
6. Use standard medical terminology recognized in ${targetName}
7. If drug names differ between languages, keep the international name and add the local name in parentheses
${langSection}
Translate the following ${sourceInstruction} to ${targetName}.
Return ONLY the translated text, nothing else.

===BEGIN TEXT===
${cleanText}
===END TEXT===`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, "translate");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
      );
    }

    const { text, source_lang, target_lang } = await request.json();

    if (!text || !target_lang) {
      return NextResponse.json({ error: "Missing required fields: text, target_lang" }, { status: 400 });
    }
    if (typeof text !== "string" || typeof target_lang !== "string") {
      return NextResponse.json({ error: "Invalid field types" }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Text exceeds ${MAX_TEXT_LENGTH} characters` }, { status: 400 });
    }

    const cleanText = sanitizeUserInput(text);
    if (!cleanText) {
      return NextResponse.json({ error: "Text is empty after sanitization" }, { status: 400 });
    }
    if (detectPromptInjection(cleanText)) {
      return NextResponse.json({ error: "Invalid input detected" }, { status: 400 });
    }

    const isEmergency = detectEmergency(cleanText);
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = buildPrompt(cleanText, source_lang, target_lang);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    });

    const rawOutput = result.response.text()?.trim() || "";
    const translatedText = validateTranslationOutput(rawOutput);

    if (!translatedText) {
      return NextResponse.json({ error: "Translation produced empty result" }, { status: 500 });
    }

    return NextResponse.json({
      translated_text: translatedText,
      is_emergency: isEmergency,
      model: "gemini-2.0-flash",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
