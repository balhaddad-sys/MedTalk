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

// Sanitize user text — remove control characters but preserve Unicode
export function sanitizeUserInput(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

// Validate translation output doesn't leak system prompt
export function validateTranslationOutput(output: string): string {
  const cleaned = output
    .replace(/^(system|assistant|user)\s*:\s*/gim, "")
    .replace(new RegExp("\\[INST\\].*?\\[\\/INST\\]", "gs"), "")
    .trim();
  return cleaned;
}

// Emergency keywords across all supported languages.
// Each keyword is lowercased for case-insensitive matching.
// Partial-match (substring) is intentional — e.g. "sangr" matches "sangrando", "sangre".
const EMERGENCY_KEYWORDS = [
  // English
  "can't breathe", "cannot breathe", "not breathing", "chest pain",
  "heart attack", "seizure", "stroke", "bleeding", "heavy blood",
  "unconscious", "fainted", "collapse", "choking", "allergic reaction",
  "anaphylaxis", "overdose", "suicide", "dying", "emergency",
  "stopped breathing", "no pulse", "cardiac arrest",

  // Arabic (العربية)
  "لا أستطيع التنفس", "ألم في الصدر", "نوبة قلبية", "سكتة",
  "نزيف", "فاقد الوعي", "إغماء", "اختناق", "حساسية شديدة",
  "تسمم", "انتحار", "يموت", "طوارئ", "حالة طارئة",
  "صعوبة في التنفس", "ضيق تنفس", "نوبة صرع",

  // Hindi (हिन्दी)
  "सांस नहीं आ रही", "छाती में दर्द", "दिल का दौरा", "बेहोश",
  "खून बह रहा", "दौरा पड़", "मिर्गी", "सांस लेने में तकलीफ",
  "आपातकाल", "मर रहा", "जहर",

  // Urdu (اردو)
  "سانس نہیں آ رہی", "سینے میں درد", "دل کا دورہ", "بے ہوش",
  "خون بہ رہا", "دورہ پڑ", "مرگی", "سانس لینے میں تکلیف",
  "ایمرجنسی", "مر رہا", "زہر",

  // Bengali (বাংলা)
  "শ্বাস নিতে পারছি না", "বুকে ব্যথা", "হার্ট অ্যাটাক",
  "অজ্ঞান", "রক্তপাত", "খিঁচুনি", "জরুরি",

  // Filipino/Tagalog
  "hindi makahinga", "sakit sa dibdib", "atake sa puso",
  "nawalan ng malay", "pagdurugo", "seizure", "emergency",

  // Farsi (فارسی)
  "نمی‌توانم نفس بکشم", "درد قفسه سینه", "حمله قلبی",
  "بی‌هوش", "خونریزی", "تشنج", "اورژانس", "سکته",

  // French
  "ne peut pas respirer", "douleur thoracique", "crise cardiaque",
  "inconscient", "hémorragie", "convulsion", "urgence",
  "arrêt cardiaque", "saignement",

  // German
  "kann nicht atmen", "brustschmerzen", "herzinfarkt",
  "bewusstlos", "blutung", "krampfanfall", "notfall",

  // Russian (Русский)
  "не могу дышать", "боль в груди", "сердечный приступ",
  "без сознания", "кровотечение", "судороги", "экстренный",

  // Korean (한국어)
  "숨을 못 쉬", "가슴 통증", "심장마비", "의식불명",
  "출혈", "발작", "응급",

  // Japanese (日本語)
  "息ができない", "胸の痛み", "心臓発作", "意識不明",
  "出血", "発作", "緊急",

  // Chinese (中文)
  "无法呼吸", "胸痛", "心脏病发作", "失去意识",
  "出血", "癫痫", "紧急", "心脏骤停",
  "無法呼吸", "胸痛", "心臟病發作", "失去意識",
  "癲癇", "緊急", "心臟驟停",

  // Turkish
  "nefes alamıyorum", "göğüs ağrısı", "kalp krizi",
  "bilinçsiz", "kanama", "nöbet", "acil",

  // Vietnamese
  "không thở được", "đau ngực", "đau tim",
  "bất tỉnh", "chảy máu", "co giật", "cấp cứu",

  // Thai
  "หายใจไม่ออก", "เจ็บหน้าอก", "หัวใจวาย",
  "หมดสติ", "เลือดออก", "ชัก", "ฉุกเฉิน",

  // Spanish (expanded)
  "no puedo respirar", "dolor de pecho", "ataque al coraz", "convulsi",
  "derrame", "sangr", "inconsciente", "emergencia",
  "paro cardíaco", "sobredosis", "suicidio",

  // Portuguese
  "não consigo respirar", "dor no peito", "ataque cardíaco",
  "inconsciente", "hemorragia", "convulsão", "emergência",

  // Somali
  "neefsankaari", "xanuunka laabta", "wadne jabin",
  "miyir la'aan", "dhiig bax", "degdeg",

  // Swahili
  "siwezi kupumua", "maumivu ya kifua", "shambulio la moyo",
  "kupoteza fahamu", "kutoka damu", "dharura",

  // Nepali
  "सास फेर्न सकिरहेको छैन", "छातीमा दुखेको", "हृदय आक्रमण",
  "बेहोस", "रगत बगिरहेको",

  // Amharic
  "መተንፈስ አልችልም", "የደረት ህመም", "የልብ ድካም",

  // Common medical codes
  "911", "code blue", "code red", "stat",
];

export function detectEmergency(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((keyword) => lower.includes(keyword));
}
