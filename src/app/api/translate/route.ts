import { NextRequest, NextResponse } from "next/server";
import getGenAI from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { text, source_lang, target_lang } = await request.json();

    if (!text || !target_lang) {
      return NextResponse.json(
        { error: "Missing required fields: text, target_lang" },
        { status: 400 }
      );
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const sourceLangInstruction = source_lang
      ? `from ${source_lang}`
      : "(auto-detect the source language)";

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a professional medical translator. Translate the following text ${sourceLangInstruction} to ${target_lang}.
Preserve medical terminology accurately. Use clear, simple language appropriate for patient-provider communication.
Return ONLY the translated text, nothing else. No quotes, no explanations.

Text to translate:
${text}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    const translatedText =
      result.response.text()?.trim() || "";

    return NextResponse.json({
      translated_text: translatedText,
      model: "gemini-2.0-flash",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
