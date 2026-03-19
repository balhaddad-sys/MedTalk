import { NextRequest, NextResponse } from "next/server";
import { getGenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, "translate");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
      );
    }

    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const conversation = messages
      .map(
        (m: { role: string; originalText: string; translatedText: string }) =>
          `[${m.role.toUpperCase()}]: ${m.originalText} (Translation: ${m.translatedText})`
      )
      .join("\n");

    const prompt = `You are a clinical documentation assistant. Based on the following patient-provider conversation, generate a structured clinical summary suitable for EHR documentation.

Format the summary with these sections:
- **Chief Complaint**: Main reason for visit
- **History of Present Illness**: Relevant symptoms, duration, severity
- **Allergies**: Any mentioned allergies
- **Current Medications**: Any mentioned medications
- **Assessment Notes**: Key observations from the conversation
- **Follow-up Needed**: Any items requiring follow-up

Only include sections that have relevant information from the conversation. Use concise, clinical language.

CONVERSATION:
${conversation}

Respond with the clinical summary only.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    });

    const summary = result.response.text()?.trim() || "";

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
