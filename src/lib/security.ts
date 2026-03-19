// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+a/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /\bprompt\s*injection\b/i,
  /act\s+as\s+(if\s+)?you\s+are/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /what\s+is\s+your\s+(system\s+)?prompt/i,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

// Sanitize user text by wrapping with clear boundaries
export function sanitizeUserInput(text: string): string {
  // Remove control characters but preserve Unicode (medical terms in other languages)
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

// Validate translation output doesn't leak system prompt
export function validateTranslationOutput(output: string): string {
  // Remove anything that looks like system instructions leaked
  const cleaned = output
    .replace(/^(system|assistant|user)\s*:\s*/gim, "")
    .replace(new RegExp("\\[INST\\].*?\\[\\/INST\\]", "gs"), "")
    .trim();
  return cleaned;
}

// Emergency keywords in multiple languages
const EMERGENCY_KEYWORDS = [
  // English
  "can't breathe", "cannot breathe", "not breathing", "chest pain",
  "heart attack", "seizure", "stroke", "bleeding", "blood",
  "unconscious", "fainted", "collapse", "choking", "allergic reaction",
  "anaphylaxis", "overdose", "suicide", "dying", "emergency",
  // Spanish
  "no puedo respirar", "dolor de pecho", "ataque al coraz", "convulsi",
  "derrame", "sangr", "inconsciente", "emergencia",
  // Common medical emergencies
  "911", "code blue", "code red", "stat",
];

export function detectEmergency(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((keyword) => lower.includes(keyword));
}
