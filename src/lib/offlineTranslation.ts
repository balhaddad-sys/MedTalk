import { ConfidenceLevel, TranslateResponse, TranslationSource } from "@/types";

type PhrasebookLanguage =
  | "en"
  | "ar"
  | "hi"
  | "ur"
  | "bn"
  | "tl"
  | "fa"
  | "es"
  | "fr";

interface PhraseEntry {
  id: string;
  emergency?: boolean;
  medicalTerms?: string[];
  aliases?: Partial<Record<PhrasebookLanguage, string[]>>;
  translations: Record<PhrasebookLanguage, string>;
}

interface TranslationMemoryRecord {
  key: string;
  sourceLang: string;
  targetLang: string;
  updatedAt: number;
  response: TranslateResponse;
}

const TRANSLATION_MEMORY_KEY = "medtalk.translation-memory.v1";
const MAX_MEMORY_ENTRIES = 300;
const MEMORY_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — expire stale translations

export const OFFLINE_PACK_LANGS = [
  "en",
  "ar",
  "hi",
  "ur",
  "bn",
  "tl",
  "fa",
  "es",
  "fr",
] as const;

const OFFLINE_PHRASEBOOK: PhraseEntry[] = [
  {
    id: "hello_help",
    aliases: {
      en: ["I need help", "I need help immediately"],
    },
    translations: {
      en: "Hello, I need help",
      ar: "مرحبًا، أحتاج إلى مساعدة",
      hi: "नमस्ते, मुझे मदद चाहिए",
      ur: "سلام، مجھے مدد چاہیے",
      bn: "হ্যালো, আমার সাহায্য দরকার",
      tl: "Hello, kailangan ko ng tulong",
      fa: "سلام، به کمک نیاز دارم",
      es: "Hola, necesito ayuda",
      fr: "Bonjour, j'ai besoin d'aide",
    },
  },
  {
    id: "pain",
    medicalTerms: ["pain"],
    aliases: {
      en: ["I have pain"],
    },
    translations: {
      en: "I am in pain",
      ar: "أشعر بألم",
      hi: "मुझे दर्द है",
      ur: "مجھے درد ہے",
      bn: "আমার ব্যথা হচ্ছে",
      tl: "Masakit ang pakiramdam ko",
      fa: "درد دارم",
      es: "Tengo dolor",
      fr: "J'ai mal",
    },
  },
  {
    id: "medication",
    medicalTerms: ["medication"],
    aliases: {
      en: ["I need medicine"],
    },
    translations: {
      en: "I need my medication",
      ar: "أحتاج إلى دوائي",
      hi: "मुझे अपनी दवा चाहिए",
      ur: "مجھے اپنی دوا چاہیے",
      bn: "আমার ওষুধ দরকার",
      tl: "Kailangan ko ang gamot ko",
      fa: "داروی خودم را می‌خواهم",
      es: "Necesito mi medicamento",
      fr: "J'ai besoin de mon médicament",
    },
  },
  {
    id: "emergency",
    emergency: true,
    aliases: {
      en: ["Emergency"],
    },
    translations: {
      en: "This is an emergency",
      ar: "هذه حالة طارئة",
      hi: "यह आपातकाल है",
      ur: "یہ ایمرجنسی ہے",
      bn: "এটি জরুরি অবস্থা",
      tl: "Emergency ito",
      fa: "این یک وضعیت اورژانسی است",
      es: "Esto es una emergencia",
      fr: "C'est une urgence",
    },
  },
  {
    id: "nauseous",
    medicalTerms: ["nausea"],
    aliases: {
      en: ["I am nauseous"],
    },
    translations: {
      en: "I feel nauseous",
      ar: "أشعر بالغثيان",
      hi: "मुझे मितली आ रही है",
      ur: "مجھے متلی ہو رہی ہے",
      bn: "আমার বমি বমি লাগছে",
      tl: "Nasusuka ako",
      fa: "حالت تهوع دارم",
      es: "Tengo náuseas",
      fr: "J'ai la nausée",
    },
  },
  {
    id: "bathroom",
    translations: {
      en: "Where is the bathroom?",
      ar: "أين الحمام؟",
      hi: "बाथरूम कहाँ है?",
      ur: "باتھ روم کہاں ہے؟",
      bn: "বাথরুম কোথায়?",
      tl: "Nasaan ang banyo?",
      fa: "دستشویی کجاست؟",
      es: "¿Dónde está el baño?",
      fr: "Où sont les toilettes ?",
    },
  },
  {
    id: "water",
    aliases: {
      en: ["I need water please"],
    },
    translations: {
      en: "I need water",
      ar: "أحتاج إلى ماء",
      hi: "मुझे पानी चाहिए",
      ur: "مجھے پانی چاہیے",
      bn: "আমার পানি দরকার",
      tl: "Kailangan ko ng tubig",
      fa: "آب می‌خواهم",
      es: "Necesito agua",
      fr: "J'ai besoin d'eau",
    },
  },
  {
    id: "allergic",
    medicalTerms: ["allergy"],
    aliases: {
      en: ["I have allergies"],
    },
    translations: {
      en: "I am allergic",
      ar: "لدي حساسية",
      hi: "मुझे एलर्जी है",
      ur: "مجھے الرجی ہے",
      bn: "আমার অ্যালার্জি আছে",
      tl: "May allergy ako",
      fa: "آلرژی دارم",
      es: "Tengo alergia",
      fr: "Je suis allergique",
    },
  },
  {
    id: "fever",
    medicalTerms: ["fever"],
    translations: {
      en: "I have a fever",
      ar: "لدي حمى",
      hi: "मुझे बुखार है",
      ur: "مجھے بخار ہے",
      bn: "আমার জ্বর আছে",
      tl: "May lagnat ako",
      fa: "تب دارم",
      es: "Tengo fiebre",
      fr: "J'ai de la fièvre",
    },
  },
  {
    id: "dizzy",
    medicalTerms: ["dizziness"],
    aliases: {
      en: ["I am dizzy"],
    },
    translations: {
      en: "I feel dizzy",
      ar: "أشعر بالدوار",
      hi: "मुझे चक्कर आ रहे हैं",
      ur: "مجھے چکر آ رہے ہیں",
      bn: "আমার মাথা ঘুরছে",
      tl: "Nahihilo ako",
      fa: "سرگیجه دارم",
      es: "Tengo mareo",
      fr: "J'ai des vertiges",
    },
  },
  {
    id: "diabetic",
    medicalTerms: ["diabetes"],
    aliases: {
      en: ["I have diabetes"],
    },
    translations: {
      en: "I am diabetic",
      ar: "لدي داء السكري",
      hi: "मुझे मधुमेह है",
      ur: "مجھے ذیابیطس ہے",
      bn: "আমার ডায়াবেটিস আছে",
      tl: "May diabetes ako",
      fa: "دیابت دارم",
      es: "Tengo diabetes",
      fr: "Je suis diabétique",
    },
  },
  {
    id: "call_family",
    translations: {
      en: "Call my family please",
      ar: "يرجى الاتصال بعائلتي",
      hi: "कृपया मेरे परिवार को फोन करें",
      ur: "براہ کرم میرے خاندان کو فون کریں",
      bn: "দয়া করে আমার পরিবারকে ফোন করুন",
      tl: "Pakiusap, tawagan ang pamilya ko",
      fa: "لطفاً به خانواده‌ام زنگ بزنید",
      es: "Llame a mi familia, por favor",
      fr: "Veuillez appeler ma famille",
    },
  },
  {
    id: "chest_pain",
    emergency: true,
    medicalTerms: ["chest pain"],
    aliases: {
      en: ["Chest pain"],
    },
    translations: {
      en: "I have chest pain",
      ar: "لدي ألم في الصدر",
      hi: "मेरे सीने में दर्द है",
      ur: "میرے سینے میں درد ہے",
      bn: "আমার বুকে ব্যথা হচ্ছে",
      tl: "Masakit ang dibdib ko",
      fa: "درد قفسه سینه دارم",
      es: "Tengo dolor en el pecho",
      fr: "J'ai mal à la poitrine",
    },
  },
  {
    id: "cant_breathe",
    emergency: true,
    medicalTerms: ["breathing"],
    aliases: {
      en: ["I cannot breathe", "Cannot breathe", "Can't breathe"],
    },
    translations: {
      en: "I can't breathe",
      ar: "لا أستطيع التنفس",
      hi: "मुझे सांस नहीं आ रही है",
      ur: "مجھے سانس نہیں آ رہی",
      bn: "আমি শ্বাস নিতে পারছি না",
      tl: "Hindi ako makahinga",
      fa: "نمی‌توانم نفس بکشم",
      es: "No puedo respirar",
      fr: "Je n'arrive pas à respirer",
    },
  },
  {
    id: "pain_here",
    translations: {
      en: "The pain is here",
      ar: "الألم هنا",
      hi: "दर्द यहाँ है",
      ur: "درد یہاں ہے",
      bn: "ব্যথা এখানে",
      tl: "Dito ang sakit",
      fa: "درد اینجاست",
      es: "El dolor está aquí",
      fr: "La douleur est ici",
    },
  },
  {
    id: "pain_severe",
    emergency: true,
    medicalTerms: ["severe pain"],
    translations: {
      en: "The pain is severe",
      ar: "الألم شديد",
      hi: "दर्द बहुत तेज़ है",
      ur: "درد بہت شدید ہے",
      bn: "ব্যথা খুব তীব্র",
      tl: "Matindi ang sakit",
      fa: "درد شدید است",
      es: "El dolor es muy intenso",
      fr: "La douleur est très forte",
    },
  },
  {
    id: "pregnant",
    medicalTerms: ["pregnant"],
    translations: {
      en: "I am pregnant",
      ar: "أنا حامل",
      hi: "मैं गर्भवती हूँ",
      ur: "میں حاملہ ہوں",
      bn: "আমি গর্ভবতী",
      tl: "Buntis ako",
      fa: "باردار هستم",
      es: "Estoy embarazada",
      fr: "Je suis enceinte",
    },
  },
  {
    id: "penicillin",
    medicalTerms: ["penicillin", "allergy"],
    translations: {
      en: "I am allergic to penicillin",
      ar: "لدي حساسية من البنسلين",
      hi: "मुझे पेनिसिलिन से एलर्जी है",
      ur: "مجھے پینسلین سے الرجی ہے",
      bn: "আমার পেনিসিলিনে অ্যালার্জি আছে",
      tl: "Allergic ako sa penicillin",
      fa: "به پنی‌سیلین حساسیت دارم",
      es: "Tengo alergia a la penicilina",
      fr: "Je suis allergique à la pénicilline",
    },
  },
  {
    id: "insulin",
    medicalTerms: ["insulin"],
    translations: {
      en: "I take insulin",
      ar: "أستخدم الإنسولين",
      hi: "मैं इंसुलिन लेता/लेती हूँ",
      ur: "میں انسولین استعمال کرتا/کرتی ہوں",
      bn: "আমি ইনসুলিন নিই",
      tl: "Gumagamit ako ng insulin",
      fa: "انسولین مصرف می‌کنم",
      es: "Uso insulina",
      fr: "Je prends de l'insuline",
    },
  },
  {
    id: "yes",
    translations: {
      en: "Yes",
      ar: "نعم",
      hi: "हाँ",
      ur: "جی ہاں",
      bn: "হ্যাঁ",
      tl: "Oo",
      fa: "بله",
      es: "Sí",
      fr: "Oui",
    },
  },
  {
    id: "no",
    translations: {
      en: "No",
      ar: "لا",
      hi: "नहीं",
      ur: "نہیں",
      bn: "না",
      tl: "Hindi",
      fa: "نه",
      es: "No",
      fr: "Non",
    },
  },
  {
    id: "dont_understand",
    translations: {
      en: "I don't understand",
      ar: "لا أفهم",
      hi: "मैं समझ नहीं पा रहा/रही हूँ",
      ur: "میں نہیں سمجھ رہا/رہی",
      bn: "আমি বুঝতে পারছি না",
      tl: "Hindi ko naiintindihan",
      fa: "متوجه نمی‌شوم",
      es: "No entiendo",
      fr: "Je ne comprends pas",
    },
  },
  {
    id: "point_pain",
    translations: {
      en: "Point to where it hurts",
      ar: "أشر إلى مكان الألم",
      hi: "जहाँ दर्द है वहाँ इशारा करें",
      ur: "جہاں درد ہے وہاں اشارہ کریں",
      bn: "যেখানে ব্যথা সেখানে দেখান",
      tl: "Ituro kung saan masakit",
      fa: "به جایی که درد دارد اشاره کنید",
      es: "Señale dónde le duele",
      fr: "Montrez où vous avez mal",
    },
  },
  {
    id: "when_started",
    translations: {
      en: "When did this start?",
      ar: "متى بدأ هذا؟",
      hi: "यह कब शुरू हुआ?",
      ur: "یہ کب شروع ہوا؟",
      bn: "এটা কখন শুরু হয়েছে?",
      tl: "Kailan ito nagsimula?",
      fa: "این از چه زمانی شروع شد؟",
      es: "¿Cuándo empezó esto?",
      fr: "Quand cela a-t-il commencé ?",
    },
  },
  {
    id: "breathing_question",
    emergency: true,
    medicalTerms: ["breathing"],
    translations: {
      en: "Are you having trouble breathing?",
      ar: "هل لديك صعوبة في التنفس؟",
      hi: "क्या आपको सांस लेने में तकलीफ़ है?",
      ur: "کیا آپ کو سانس لینے میں دقت ہے؟",
      bn: "আপনার কি শ্বাস নিতে কষ্ট হচ্ছে?",
      tl: "Nahihirapan ka bang huminga?",
      fa: "آیا در تنفس مشکل دارید؟",
      es: "¿Tiene dificultad para respirar?",
      fr: "Avez-vous du mal à respirer ?",
    },
  },
  {
    id: "medicine_allergy_question",
    medicalTerms: ["medicine", "allergy"],
    translations: {
      en: "Are you allergic to any medicine?",
      ar: "هل لديك حساسية من أي دواء؟",
      hi: "क्या आपको किसी दवा से एलर्जी है?",
      ur: "کیا آپ کو کسی دوا سے الرجی ہے؟",
      bn: "আপনার কি কোনো ওষুধে অ্যালার্জি আছে?",
      tl: "Allergic ka ba sa anumang gamot?",
      fa: "آیا به دارویی حساسیت دارید؟",
      es: "¿Tiene alergia a algún medicamento?",
      fr: "Êtes-vous allergique à un médicament ?",
    },
  },
  {
    id: "medicines_question",
    medicalTerms: ["medicines"],
    translations: {
      en: "What medicines do you take?",
      ar: "ما الأدوية التي تتناولها؟",
      hi: "आप कौन सी दवाएँ लेते हैं?",
      ur: "آپ کون سی دوائیں لیتے ہیں؟",
      bn: "আপনি কোন ওষুধ খান?",
      tl: "Anong mga gamot ang iniinom mo?",
      fa: "چه داروهایی مصرف می‌کنید؟",
      es: "¿Qué medicamentos toma?",
      fr: "Quels médicaments prenez-vous ?",
    },
  },
  {
    id: "help_coming",
    translations: {
      en: "Help is coming",
      ar: "المساعدة في الطريق",
      hi: "मदद आ रही है",
      ur: "مدد آ رہی ہے",
      bn: "সাহায্য আসছে",
      tl: "Paparating na ang tulong",
      fa: "کمک در راه است",
      es: "La ayuda viene en camino",
      fr: "De l'aide arrive",
    },
  },
];

function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,!?;:()[\]{}"“”]/g, " ")
    .replace(/[،؟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseLang(code: string): string {
  return code.split("-")[0];
}

function isPhrasebookLanguage(code: string): code is PhrasebookLanguage {
  return (OFFLINE_PACK_LANGS as readonly string[]).includes(code);
}

function resolvePhrasebookLanguage(code: string): PhrasebookLanguage | null {
  if (isPhrasebookLanguage(code)) return code;

  const baseCode = baseLang(code);
  return isPhrasebookLanguage(baseCode) ? baseCode : null;
}

function buildMemoryKey(text: string, sourceLang: string, targetLang: string): string {
  return `${baseLang(sourceLang)}::${baseLang(targetLang)}::${normalizeText(text)}`;
}

function readTranslationMemory(): TranslationMemoryRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TRANSLATION_MEMORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as TranslationMemoryRecord[];
    if (!Array.isArray(parsed)) return [];

    // Filter out expired entries
    const now = Date.now();
    const active = parsed.filter((entry) => now - entry.updatedAt < MEMORY_TTL_MS);

    // Write back if we pruned any entries
    if (active.length < parsed.length) {
      writeTranslationMemory(active);
    }

    return active;
  } catch {
    return [];
  }
}

function writeTranslationMemory(records: TranslationMemoryRecord[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TRANSLATION_MEMORY_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage failures. The app should keep working even when storage is full.
  }
}

function buildOfflineResponse(
  response: TranslateResponse,
  translationSource: TranslationSource,
  includeVerification: boolean
): TranslateResponse {
  return {
    ...response,
    back_translation: includeVerification ? response.back_translation : undefined,
    medical_terms: includeVerification ? response.medical_terms ?? [] : [],
    translation_source: translationSource,
  };
}

function findPhraseMatch(text: string, sourceLang: PhrasebookLanguage) {
  const normalized = normalizeText(text);

  return OFFLINE_PHRASEBOOK.find((entry) => {
    const variants = [
      entry.translations[sourceLang],
      ...(entry.aliases?.[sourceLang] ?? []),
    ].map(normalizeText);

    return variants.includes(normalized);
  });
}

function lookupTranslationMemory(
  text: string,
  sourceLang: string,
  targetLang: string,
  includeVerification: boolean
): TranslateResponse | null {
  const key = buildMemoryKey(text, sourceLang, targetLang);
  const record = readTranslationMemory().find((entry) => entry.key === key);

  if (!record) return null;

  return buildOfflineResponse(
    {
      ...record.response,
      model: record.response.model || "offline-memory",
    },
    "offline_memory",
    includeVerification
  );
}

function lookupPhrasebook(
  text: string,
  sourceLang: string,
  targetLang: string,
  includeVerification: boolean
): TranslateResponse | null {
  const sourceCode = resolvePhrasebookLanguage(sourceLang);
  const targetCode = resolvePhrasebookLanguage(targetLang);

  if (!sourceCode || !targetCode) return null;

  const phrase = findPhraseMatch(text, sourceCode);
  if (!phrase) return null;

  return {
    translated_text: phrase.translations[targetCode],
    back_translation: includeVerification ? phrase.translations[sourceCode] : undefined,
    confidence: "high",
    medical_terms: includeVerification ? phrase.medicalTerms ?? [] : [],
    is_emergency: phrase.emergency ?? false,
    model: "offline-phrasebook",
    translation_source: "offline_phrasebook",
  };
}

export function hasOfflinePackForPair(sourceLang: string, targetLang: string): boolean {
  return Boolean(
    resolvePhrasebookLanguage(sourceLang) && resolvePhrasebookLanguage(targetLang)
  );
}

export function getOfflineTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  includeVerification = false
): TranslateResponse | null {
  return (
    lookupTranslationMemory(text, sourceLang, targetLang, includeVerification) ||
    lookupPhrasebook(text, sourceLang, targetLang, includeVerification)
  );
}

export function storeTranslationMemory(
  text: string,
  sourceLang: string,
  targetLang: string,
  response: TranslateResponse
) {
  if (typeof window === "undefined" || !text.trim() || !response.translated_text.trim()) {
    return;
  }

  const nextEntry: TranslationMemoryRecord = {
    key: buildMemoryKey(text, sourceLang, targetLang),
    sourceLang: baseLang(sourceLang),
    targetLang: baseLang(targetLang),
    updatedAt: Date.now(),
    response: {
      translated_text: response.translated_text,
      back_translation: response.back_translation,
      confidence: response.confidence,
      medical_terms: response.medical_terms ?? [],
      is_emergency: response.is_emergency,
      model: response.model || "cloud",
      translation_source: response.translation_source ?? "cloud",
    },
  };

  const records = readTranslationMemory().filter((entry) => entry.key !== nextEntry.key);
  records.unshift(nextEntry);
  writeTranslationMemory(records.slice(0, MAX_MEMORY_ENTRIES));
}

export function createPassthroughTranslation(text: string): TranslateResponse {
  return {
    translated_text: text,
    back_translation: text,
    confidence: "high" as ConfidenceLevel,
    medical_terms: [],
    is_emergency: false,
    model: "local-passthrough",
    translation_source: "local_passthrough",
  };
}
