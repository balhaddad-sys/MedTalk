import { NextRequest, NextResponse } from "next/server";
import { getGenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { detectPromptInjection, sanitizeUserInput, validateTranslationOutput, detectEmergency } from "@/lib/security";

const MAX_TEXT_LENGTH = 2000;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
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
      return NextResponse.json(
        { error: "Missing required fields: text, target_lang" },
        { status: 400 }
      );
    }

    // Input validation
    if (typeof text !== "string" || typeof target_lang !== "string") {
      return NextResponse.json(
        { error: "Invalid field types" },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Sanitize input
    const cleanText = sanitizeUserInput(text);
    if (!cleanText) {
      return NextResponse.json(
        { error: "Text is empty after sanitization" },
        { status: 400 }
      );
    }

    // Prompt injection detection
    if (detectPromptInjection(cleanText)) {
      return NextResponse.json(
        { error: "Invalid input detected" },
        { status: 400 }
      );
    }

    // Emergency detection
    const isEmergency = detectEmergency(cleanText);

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const sourceLangInstruction = source_lang
      ? `from ${source_lang}`
      : "(auto-detect the source language)";

    // Enhanced medical translation prompt with structured output
    const prompt = `You are a certified medical interpreter AI. Your task is to translate medical communications between patients and healthcare providers.

STRICT RULES:
1. Preserve ALL medical terminology exactly (drug names, dosages, units, anatomical terms)
2. Use formal/polite register appropriate for clinical settings
3. Never omit, add, or interpret information - translate exactly what was said
4. For ambiguous terms, prefer the medical interpretation
5. Preserve numbers, dates, and measurements exactly as stated
6. Use standard medical terminology in the target language
7. For Spanish: use formal "usted" form
8. For German: use formal "Sie" form
9. For Korean/Japanese: use honorific forms appropriate for medical settings
10. For Arabic: use Modern Standard Arabic for medical terms

Respond in valid JSON format with these fields:
- "translated_text": the translation ${sourceLangInstruction} to ${target_lang}
- "back_translation": translate the result back to the source language to verify accuracy
- "confidence": "high", "medium", or "low" based on translation certainty
- "medical_terms": array of medical terms found in the text (in the original language)

===BEGIN USER TEXT===
${cleanText}
===END USER TEXT===

Respond ONLY with valid JSON, no markdown, no code fences.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    });

    const rawOutput = result.response.text()?.trim() || "";

    // Try to parse structured JSON response
    let translatedText: string;
    let backTranslation: string | undefined;
    let confidence: "high" | "medium" | "low" | undefined;
    let medicalTerms: string[] | undefined;

    try {
      // Strip markdown code fences if present
      const jsonStr = rawOutput.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(jsonStr);
      translatedText = validateTranslationOutput(parsed.translated_text || "");
      backTranslation = parsed.back_translation;
      confidence = ["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : undefined;
      medicalTerms = Array.isArray(parsed.medical_terms)
        ? parsed.medical_terms.filter((t: unknown) => typeof t === "string")
        : undefined;
    } catch {
      // Fallback: treat as plain text translation
      translatedText = validateTranslationOutput(rawOutput);
    }

    if (!translatedText) {
      return NextResponse.json(
        { error: "Translation produced empty result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      translated_text: translatedText,
      back_translation: backTranslation,
      confidence: confidence || "medium",
      medical_terms: medicalTerms || [],
      is_emergency: isEmergency,
      model: "gemini-2.0-flash",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
