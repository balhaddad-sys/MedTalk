import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { detectPromptInjection, sanitizeUserInput, validateTranslationOutput, detectEmergency } from "@/lib/security";
import { parseJsonObject } from "@/lib/json";
import { ConfidenceLevel } from "@/types";

const MAX_TEXT_LENGTH = 2000;

// Full language names for clear prompts
const LANG_NAMES: Record<string, string> = {
  ar: "Arabic (Modern Standard Arabic)", en: "English", hi: "Hindi", ur: "Urdu",
  bn: "Bengali", ml: "Malayalam", ta: "Tamil", te: "Telugu", ne: "Nepali",
  si: "Sinhala", tl: "Filipino (Tagalog)", fa: "Farsi (Persian)",
  ku: "Kurdish (Sorani)", tr: "Turkish", he: "Hebrew", am: "Amharic",
  sw: "Swahili", so: "Somali", fr: "French", es: "Spanish",
  de: "German", ru: "Russian", uk: "Ukrainian", it: "Italian",
  pl: "Polish", pt: "Brazilian Portuguese", zh: "Simplified Chinese",
  "zh-TW": "Traditional Chinese", ja: "Japanese", ko: "Korean",
  vi: "Vietnamese", th: "Thai", my: "Burmese", ht: "Haitian Creole",
};

// Deep language-specific rules for flawless output
const LANG_RULES: Record<string, string> = {
  ar: `- Use Modern Standard Arabic (الفصحى), NOT colloquial/dialect Arabic.
- Use Arabic medical terminology as used in Arab medical schools (e.g. ضغط الدم not بريشر).
- Keep drug names in their international form followed by Arabic transliteration: e.g. Paracetamol (باراسيتامول).
- Numbers should be in Arabic-Indic numerals (١٢٣) when embedded in Arabic text.
- Ensure proper RTL formatting with correct hamza, taa marbuta, and diacritics on ambiguous medical terms.`,

  ur: `- Use formal Urdu (ادبی اردو) with Nastaliq-friendly phrasing.
- Address the patient with آپ (formal you).
- Medical terms in Urdu script with Latin original in parentheses for drug names: e.g. پیراسیٹامول (Paracetamol).
- Ensure proper RTL formatting.`,

  hi: `- Use formal Hindi (शुद्ध हिन्दी), NOT Hinglish.
- Address patient with आप (formal).
- Use Devanagari script throughout. Medical terms should use Hindi equivalents where they exist (रक्तचाप for blood pressure), with English in parentheses for drug names.`,

  fa: `- Use formal Farsi (فارسی رسمی), not colloquial Tehran dialect.
- Medical terminology should follow Iranian medical convention.
- Keep drug names in international form with Persian transliteration.
- Ensure proper RTL formatting with correct ezafe constructions.`,

  es: `- Use formal register with "usted" (NOT "tú").
- Use Latin American Spanish medical terminology by default.
- "Blood pressure" = "presión arterial", "pain" = "dolor", "fever" = "fiebre".
- Preserve the polite, clinical tone throughout.`,

  fr: `- Use formal register with "vous" (NOT "tu").
- Use standard French medical terminology.
- "Blood pressure" = "tension artérielle", "pain" = "douleur".`,

  de: `- Use formal register with "Sie" (NOT "du").
- Use standard German medical compound nouns: Blutdruck, Kopfschmerzen, Medikament.`,

  ko: `- Use 존댓말 (formal honorific speech level) throughout.
- End sentences with -습니다/-ㅂ니다 form.
- Use Korean medical terminology (혈압 for blood pressure, 통증 for pain).`,

  ja: `- Use 敬語 (keigo) throughout — specifically 丁寧語 (teineigo) with です/ます forms.
- Use standard Japanese medical terminology (血圧, 頭痛, 薬).
- Use katakana for foreign drug names.`,

  zh: `- Use Simplified Chinese characters (简体中文).
- Use standard PRC medical terminology (血压, 头痛, 药物).
- Formal register appropriate for hospital settings.`,

  "zh-TW": `- Use Traditional Chinese characters (繁體中文).
- Use Taiwan/Hong Kong medical terminology conventions (血壓, 頭痛, 藥物).`,

  tr: `- Use formal register with "siz" (NOT "sen").
- Use standard Turkish medical terminology.`,

  ru: `- Use formal register with "Вы" (NOT "ты").
- Use standard Russian medical terminology (артериальное давление, головная боль).`,

  pt: `- Use Brazilian Portuguese by default.
- Use formal register with "o senhor/a senhora".
- Use Brazilian medical terminology conventions.`,

  tl: `- Use formal Filipino/Tagalog with "po" and "opo" markers of respect.
- Mix in standard English medical terms where Filipino equivalents are uncommon.`,

  vi: `- Use formal Vietnamese appropriate for medical settings.
- Use Vietnamese medical terminology where standard terms exist.`,

  th: `- Use formal Thai with ครับ/ค่ะ polite particles.
- Use standard Thai medical terminology.`,

  bn: `- Use formal Bangla (শুদ্ধ বাংলা). Use respectful আপনি form.`,
  ml: `- Use formal Malayalam. Use respectful നിങ്ങൾ/താങ്കൾ forms.`,
  ta: `- Use formal Tamil. Use respectful நீங்கள் form.`,
  te: `- Use formal Telugu. Use respectful మీరు form.`,
  ne: `- Use formal Nepali with Devanagari. Use respectful तपाईं form.`,
  si: `- Use formal Sinhala. Use respectful forms.`,
  ku: `- Use Sorani Kurdish with Arabic script. Ensure RTL formatting.`,
  he: `- Use formal Modern Hebrew. Ensure RTL formatting.`,
  uk: `- Use formal Ukrainian with "Ви" form.`,
  it: `- Use formal Italian with "Lei" form.`,
  pl: `- Use formal Polish with "Pan/Pani" forms.`,
  so: `- Use standard Somali with formal register.`,
  sw: `- Use standard Swahili (Kiswahili sanifu).`,
  am: `- Use formal Amharic with Ge'ez script.`,
  my: `- Use formal Burmese.`,
  ht: `- Use standard Haitian Creole. Keep medical terms simple and clear.`,
  en: `- Use clear, simple medical English at a 6th-grade reading level.
- Avoid unnecessary jargon. Say "high blood pressure" alongside "hypertension".
- Use short sentences.`,
};

function resolveName(code: string): string {
  return LANG_NAMES[code] || LANG_NAMES[code.split("-")[0]] || code;
}

function buildSystemPrompt(
  sourceCode: string | undefined,
  targetCode: string,
  includeVerification: boolean
): string {
  const sourceName = sourceCode ? resolveName(sourceCode) : "the detected source language";
  const targetName = resolveName(targetCode);

  const targetRules = LANG_RULES[targetCode] || LANG_RULES[targetCode.split("-")[0]] || "";
  const sourceRules = sourceCode && sourceCode !== targetCode
    ? LANG_RULES[sourceCode] || LANG_RULES[sourceCode.split("-")[0]] || ""
    : "";

  if (!includeVerification) {
    return `You are a fast medical interpreter translating from ${sourceName} to ${targetName}.

Rules:
1. Preserve exact meaning, symptom severity, medications, numbers, units, and body locations.
2. Use natural, formal hospital language in ${targetName}.
3. Do not add explanations or commentary.
${targetRules ? `4. Follow these target-language rules:\n${targetRules}\n` : ""}

Return JSON only:
{
  "translated_text": "final translation in ${targetName}",
  "confidence": "high" | "medium" | "low"
}`;
  }

  return `You are a world-class certified medical interpreter with 20 years of experience translating between ${sourceName} and ${targetName} in hospital and clinical settings.

YOUR MISSION: Produce a translation so natural and accurate that a native ${targetName} speaker who is a medical professional would find it indistinguishable from text originally written in ${targetName}.

UNDERSTANDING INPUT — this is critical:
- Patients and providers speak in their EVERYDAY language: colloquial dialects, slang, broken grammar, code-switching, and informal expressions.
- You MUST understand ALL dialects and registers of ${sourceName}: Gulf Arabic, Egyptian Arabic, Levantine Arabic, Maghrebi Arabic; Mexican/Caribbean/Rioplatense Spanish; Quebec/African French; Hinglish; Taglish; regional dialects; street slang; immigrant speech patterns.
- Patients may say things like "mi barriga me duele bien feo" (not "tengo dolor abdominal"), "mera sir phat raha hai" (Hinglish), "batan zayda" (Gulf Arabic for "my stomach is very"), "je feel pas bien" (Franco-immigrant), or mix languages freely.
- NEVER fail to understand because the input isn't "proper" or "formal". Real patients don't speak textbook language. Interpret their meaning accurately regardless of how they express it.
- If speech-to-text produces garbled or phonetic text, use context to infer the most likely medical meaning.

ABSOLUTE RULES — violating any of these is a critical error:
1. ACCURACY: Translate the EXACT meaning. Never add, omit, soften, or editorialize. If the patient says "it hurts like hell", translate the intensity faithfully.
2. MEDICAL TERMS: Preserve drug names (Paracetamol, Amoxicillin), dosages (500mg), units, and anatomical terms with 100% precision. A mistranslation of "mg" to "g" could be fatal.
3. NUMBERS: Translate numbers, dates, and measurements EXACTLY. "500mg twice daily" must remain "500mg twice daily" in meaning.
4. REGISTER: Output must use formal, clinical-appropriate language in ${targetName} — but input may be in ANY register, dialect, or mixed language. Always "translate up" from colloquial input to formal medical output.
5. NATURALNESS: The output must read as natural ${targetName}, not as a word-for-word gloss. Use the grammar, idioms, and sentence structure native speakers expect.
6. COMPLETENESS: Translate everything. Never summarize, truncate, or skip parts of the input.
7. DIALECT INTELLIGENCE: When the input contains dialect-specific words, slang, or colloquialisms, translate the MEANING, not the literal words. "Me duele la panza" and "tengo dolor abdominal" mean the same thing — translate the meaning.

${targetRules ? `SPECIFIC ${targetName.toUpperCase()} RULES:\n${targetRules}\n` : ""}${sourceRules ? `\nSOURCE LANGUAGE (${sourceName}) NOTES:\n${sourceRules}\n` : ""}
Return JSON only with this shape:
{
  "translated_text": "final translation in ${targetName}",
  "back_translation": "translate your final answer back into ${sourceName}",
  "confidence": "high" | "medium" | "low",
  "medical_terms": ["up to 8 clinically important terms copied exactly from translated_text"]
}

Confidence guide:
- high: meaning, severity, numbers, units, anatomy, and medications are fully preserved with no material ambiguity
- medium: understandable but at least one phrase should be confirmed
- low: potentially unsafe ambiguity, especially around symptoms, timing, body location, medications, or numbers

Back-translation must be plain clinical wording, not a word-for-word gloss.
Never include markdown, commentary, or extra keys.`;
}

interface TranslationModelOutput {
  translated_text?: unknown;
  back_translation?: unknown;
  confidence?: unknown;
  medical_terms?: unknown;
}

function normalizeConfidence(value: unknown): ConfidenceLevel {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeMedicalTerms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((term) => term.trim())
        .filter(Boolean)
        .slice(0, 8)
    )
  );
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

    const {
      text,
      source_lang,
      target_lang,
      mode,
      include_verification,
    } = await request.json();
    const translationMode = mode === "fast" ? "fast" : "precision";
    const includeVerification =
      typeof include_verification === "boolean"
        ? include_verification
        : translationMode !== "fast";

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
    const openai = getOpenAI();
    const systemPrompt = buildSystemPrompt(source_lang, target_lang, includeVerification);
    const model = "gpt-4o";
    const maxTokens = includeVerification ? 1200 : 600;

    const sourceName = source_lang ? resolveName(source_lang) : null;
    const targetName = resolveName(target_lang);
    const userMsg = sourceName
      ? `Translate from ${sourceName} to ${targetName}:\n\n${cleanText}`
      : `Translate to ${targetName}:\n\n${cleanText}`;

    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
    });

    const rawOutput = response.choices[0]?.message?.content?.trim() || "";
    const parsed = parseJsonObject<TranslationModelOutput>(rawOutput);
    const translatedText = validateTranslationOutput(
      typeof parsed.translated_text === "string" ? parsed.translated_text : ""
    );
    const backTranslation = validateTranslationOutput(
      typeof parsed.back_translation === "string" ? parsed.back_translation : ""
    );
    const confidence = normalizeConfidence(parsed.confidence);
    const medicalTerms = normalizeMedicalTerms(parsed.medical_terms);

    if (!translatedText) {
      return NextResponse.json({ error: "Translation produced empty result" }, { status: 500 });
    }

    return NextResponse.json({
      translated_text: translatedText,
      back_translation: includeVerification ? backTranslation || undefined : undefined,
      confidence,
      medical_terms: includeVerification ? medicalTerms : [],
      is_emergency: isEmergency,
      model,
      translation_source: "cloud",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
