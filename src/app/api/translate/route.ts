import { NextRequest, NextResponse } from "next/server";
import getOpenAI from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { text, source_lang, target_lang } = await request.json();

    if (!text || !target_lang) {
      return NextResponse.json(
        { error: "Missing required fields: text, target_lang" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();

    const sourceLangInstruction = source_lang
      ? `from ${source_lang}`
      : "(auto-detect the source language)";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "You are a professional medical translator. Preserve medical terminology accurately. Use clear, simple language appropriate for patient-provider communication. Return ONLY the translated text, nothing else. No quotes, no explanations.",
        },
        {
          role: "user",
          content: `Translate the following text ${sourceLangInstruction} to ${target_lang}:\n\n${text}`,
        },
      ],
    });

    const translatedText =
      completion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      translated_text: translatedText,
      model: "gpt-4o-mini",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
