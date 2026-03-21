const HIGH_RISK_PATTERNS = [
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|g|kg|lb|ml|mL|l|L|mmhg|mmol|meq|units?|drops?|tablets?|capsules?)\b/i,
  /\b(?:every|once|twice|daily|hourly|hours|days|weeks|months|years|since|for)\b/i,
  /\b(?:allerg(?:y|ic)|penicillin|insulin|warfarin|aspirin|ibuprofen|acetaminophen|paracetamol|amoxicillin|metformin|prednisone|antibiotic|medicine|medication|dose|dosage|pill|tablet|capsule|inhaler|injection)\b/i,
  /\b(?:left|right|both|upper|lower|front|back|arm|leg|chest|abdomen|stomach|head|eye|ear|throat|pelvis)\b/i,
  /\b(?:pregnan|bleeding|chest pain|short(?:ness)? of breath|can't breathe|cannot breathe|faint|passed out|seizure|stroke|suicid|overdose|anaphyl|allergic reaction)\b/i,
  /\b(?:no|not|denies|without|none|never)\b/i,
  /\b(?:today|yesterday|tomorrow|\d{1,2}:\d{2}\s?(?:am|pm)?)\b/i,
  /(?:ألم|الصدر|تنفس|دوخة|حساسية|أنسولين|بنسلين|نزيف|حامل|طارئة)/i,
  /(?:insulina|unidades|pecho|respirar|alergia|sangrado|embarazo)/i,
  /(?:गर्भावस्था|खून|सांस|सीने|एलर्जी|इंसुलिन)/i,
];

const DETAIL_PATTERNS = [
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|g|kg|lb|ml|mL|l|L|mmHg|mmol|mEq|units?|drops?|tablets?|capsules?)\b/gi,
  /\b(?:left|right|both)\s+[a-z]+(?:\s+[a-z]+)?\b/gi,
  /\b(?:no|denies|without)\s+[^,.;]{1,40}/gi,
  /\b(?:today|yesterday|tomorrow|\d{1,2}:\d{2}\s?(?:am|pm)?|\d{1,2}\s?(?:am|pm)|for \d+\s+(?:day|days|week|weeks|month|months|year|years))\b/gi,
  /\b(?:penicillin|insulin|warfarin|aspirin|ibuprofen|acetaminophen|paracetamol|amoxicillin|metformin|prednisone)\b/gi,
];

function dedupe(items, limit = 8) {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean))
  ).slice(0, limit);
}

function looksAscii(text) {
  return /^[\x00-\x7F\s]*$/.test(text);
}

function cleanToken(token) {
  return token
    .trim()
    .replace(/^[^0-9A-Za-z]+|[^0-9A-Za-z]+$/g, "")
    .trim();
}

export function shouldEscalateMedicalVerification(text) {
  return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text));
}

export function extractCriticalDetails(text, limit = 8) {
  const matches = [];

  for (const pattern of DETAIL_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  return dedupe(matches, limit);
}

export function buildMedicalVerificationNotes(
  text,
  confidence = "medium",
  suspectTerms = []
) {
  const notes = [];

  if (/\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|g|kg|lb|ml|mL|l|L|mmhg|mmol|meq|units?)\b/i.test(text)) {
    notes.push("Confirm numbers, doses, units, and frequencies before acting.");
  }

  if (/\b(?:allerg(?:y|ic)|penicillin|insulin|warfarin|aspirin|ibuprofen|acetaminophen|paracetamol|amoxicillin|metformin|prednisone|medicine|medication|dose|dosage)\b/i.test(text)) {
    notes.push("Confirm medication names, allergies, and routes.");
  }

  if (/\b(?:left|right|both|upper|lower|front|back|arm|leg|chest|abdomen|stomach|head|eye|ear|throat|pelvis)\b/i.test(text)) {
    notes.push("Confirm body location and left or right side.");
  }

  if (/\b(?:no|not|denies|without|none|never)\b/i.test(text)) {
    notes.push("Confirm negated symptoms and allergies were preserved exactly.");
  }

  if (/\b(?:pregnan|bleeding|chest pain|short(?:ness)? of breath|can't breathe|cannot breathe|faint|passed out|seizure|stroke|suicid|overdose|anaphyl|allergic reaction)\b/i.test(text)) {
    notes.push("Repeat back symptom severity and any emergency details.");
  }

  if (suspectTerms.length > 0) {
    notes.push(`Recheck these uncertain voice terms: ${suspectTerms.slice(0, 5).join(", ")}.`);
  }

  if (notes.length === 0 && confidence !== "high") {
    notes.push("Ask the speaker to repeat the highest-risk details before using this clinically.");
  }

  return dedupe(notes, 6);
}

export function normalizeTextForSpeech(text) {
  let normalized = text
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!looksAscii(normalized)) {
    return normalized;
  }

  normalized = normalized
    .replace(/\bmg\b/gi, "milligrams")
    .replace(/\bmcg\b/gi, "micrograms")
    .replace(/\bml\b/gi, "milliliters")
    .replace(/\bmmhg\b/gi, "millimeters of mercury")
    .replace(/\bIV\b/g, "I V")
    .replace(/\bIM\b/g, "I M")
    .replace(/\bER\b/g, "E R");

  return normalized;
}

export function buildTtsInstructions(text) {
  const highRisk = shouldEscalateMedicalVerification(text);

  if (highRisk) {
    return [
      "Read this as a hospital safety message.",
      "Speak slowly, clearly, and calmly.",
      "Pause briefly around medication names, numbers, units, dates, and times.",
      "Do not improvise or summarize.",
      "Sound careful rather than authoritative.",
    ].join(" ");
  }

  return [
    "Read this as a medical interpreter playback.",
    "Speak clearly and naturally.",
    "Keep a steady pace with clean pronunciation.",
    "Do not add extra words.",
  ].join(" ");
}

export function summarizeTranscriptionLogprobs(logprobs = []) {
  const usable = logprobs.filter(
    (entry) => typeof entry.logprob === "number" && Number.isFinite(entry.logprob)
  );

  if (usable.length === 0) {
    return {
      confidence: "medium",
      lowConfidenceTerms: [],
      averageLogprob: null,
    };
  }

  const averageLogprob =
    usable.reduce((total, entry) => total + entry.logprob, 0) / usable.length;
  const lowConfidenceTerms = dedupe(
    usable
      .filter((entry) => entry.logprob < -1)
      .map((entry) => cleanToken(entry.token ?? ""))
      .filter(Boolean),
    8
  );
  const lowRatio = lowConfidenceTerms.length / Math.max(usable.length, 1);

  let confidence = "low";
  if (averageLogprob >= -0.35 && lowRatio <= 0.08) {
    confidence = "high";
  } else if (averageLogprob >= -0.9 && lowRatio <= 0.2) {
    confidence = "medium";
  }

  return {
    confidence,
    lowConfidenceTerms,
    averageLogprob,
  };
}
