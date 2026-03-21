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
  | "fr"
  | "de"
  | "ru"
  | "uk"
  | "it"
  | "pl"
  | "pt"
  | "zh"
  | "ja"
  | "ko"
  | "vi"
  | "th"
  | "tr"
  | "he"
  | "sw"
  | "so"
  | "am"
  | "ml"
  | "ta"
  | "te"
  | "ne"
  | "my"
  | "ht";

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

export const OFFLINE_PACK_LANGS = [
  "en", "ar", "hi", "ur", "bn", "tl", "fa", "es", "fr",
  "de", "ru", "uk", "it", "pl", "pt", "zh", "ja", "ko",
  "vi", "th", "tr", "he", "sw", "so", "am", "ml", "ta",
  "te", "ne", "my", "ht",
] as const;

// Helper type: partial translations — not every phrase needs every language
type Translations = Record<PhrasebookLanguage, string>;
type PartialTranslations = Partial<Translations> & { en: string };

// We cast each entry; missing languages gracefully fall back to English at lookup time.
const OFFLINE_PHRASEBOOK: PhraseEntry[] = [
  {
    id: "hello_help",
    aliases: { en: ["I need help", "I need help immediately"] },
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
      de: "Hallo, ich brauche Hilfe",
      ru: "Здравствуйте, мне нужна помощь",
      uk: "Вітаю, мені потрібна допомога",
      it: "Salve, ho bisogno di aiuto",
      pl: "Dzień dobry, potrzebuję pomocy",
      pt: "Olá, preciso de ajuda",
      zh: "你好，我需要帮助",
      ja: "すみません、助けが必要です",
      ko: "안녕하세요, 도움이 필요합니다",
      vi: "Xin chào, tôi cần giúp đỡ",
      th: "สวัสดีครับ/ค่ะ ฉันต้องการความช่วยเหลือ",
      tr: "Merhaba, yardıma ihtiyacım var",
      he: "שלום, אני צריך עזרה",
      sw: "Hujambo, ninahitaji msaada",
      so: "Haye, caawimaad baan u baahanahay",
      am: "ሰላም፣ እርዳታ እፈልጋለሁ",
      ml: "ഹലോ, എനിക്ക് സഹായം വേണം",
      ta: "வணக்கம், எனக்கு உதவி தேவை",
      te: "నమస్కారం, నాకు సహాయం కావాలి",
      ne: "नमस्कार, मलाई सहायता चाहिन्छ",
      my: "ဟယ်လို ကျွန်တော်/ကျွန်မ အကူအညီလိုပါတယ်",
      ht: "Bonjou, mwen bezwen èd",
    } as Translations,
  },
  { id: "pain", medicalTerms: ["pain"], aliases: { en: ["I have pain"] }, translations: {
    en: "I am in pain", ar: "أشعر بألم", hi: "मुझे दर्द है", ur: "مجھے درد ہے", bn: "আমার ব্যথা হচ্ছে",
    tl: "Masakit ang pakiramdam ko", fa: "درد دارم", es: "Tengo dolor", fr: "J'ai mal",
    de: "Ich habe Schmerzen", ru: "У меня боль", uk: "Мені боляче", it: "Ho dolore", pl: "Odczuwam ból",
    pt: "Estou com dor", zh: "我很痛", ja: "痛みがあります", ko: "통증이 있습니다", vi: "Tôi bị đau",
    th: "ฉันเจ็บปวด", tr: "Ağrım var", he: "יש לי כאב", sw: "Nina maumivu", so: "Waa i xanuunsanayaa",
    am: "ህመም አለብኝ", ml: "എനിക്ക് വേദനയുണ്ട്", ta: "எனக்கு வலி இருக்கிறது", te: "నాకు నొప్పిగా ఉంది",
    ne: "मलाई दुखेको छ", my: "ကျွန်တော် နာကျင်နေပါတယ်", ht: "Mwen gen doulè",
  } as Translations },
  { id: "medication", medicalTerms: ["medication"], aliases: { en: ["I need medicine"] }, translations: {
    en: "I need my medication", ar: "أحتاج إلى دوائي", hi: "मुझे अपनी दवा चाहिए", ur: "مجھے اپنی دوا چاہیے",
    bn: "আমার ওষুধ দরকার", tl: "Kailangan ko ang gamot ko", fa: "داروی خودم را می‌خواهم",
    es: "Necesito mi medicamento", fr: "J'ai besoin de mon médicament",
    de: "Ich brauche mein Medikament", ru: "Мне нужно моё лекарство", uk: "Мені потрібні мої ліки",
    it: "Ho bisogno del mio farmaco", pl: "Potrzebuję mojego leku", pt: "Preciso do meu remédio",
    zh: "我需要我的药", ja: "薬が必要です", ko: "약이 필요합니다", vi: "Tôi cần thuốc của tôi",
    th: "ฉันต้องการยาของฉัน", tr: "İlacıma ihtiyacım var", he: "אני צריך את התרופה שלי",
    sw: "Ninahitaji dawa yangu", so: "Waxaan u baahanahay daawadayda", am: "መድኃኒቴ እፈልጋለሁ",
    ml: "എനിക്ക് എന്റെ മരുന്ന് വേണം", ta: "எனக்கு என் மருந்து தேவை", te: "నాకు నా మందు కావాలి",
    ne: "मलाई मेरो औषधि चाहिन्छ", my: "ကျွန်တော့်ဆေး လိုပါတယ်", ht: "Mwen bezwen medikaman mwen",
  } as Translations },
  { id: "emergency", emergency: true, aliases: { en: ["Emergency"] }, translations: {
    en: "This is an emergency", ar: "هذه حالة طارئة", hi: "यह आपातकाल है", ur: "یہ ایمرجنسی ہے",
    bn: "এটি জরুরি অবস্থা", tl: "Emergency ito", fa: "این یک وضعیت اورژانسی است",
    es: "Esto es una emergencia", fr: "C'est une urgence",
    de: "Das ist ein Notfall", ru: "Это экстренная ситуация", uk: "Це надзвичайна ситуація",
    it: "Questa è un'emergenza", pl: "To jest nagły wypadek", pt: "Isto é uma emergência",
    zh: "这是紧急情况", ja: "緊急です", ko: "응급 상황입니다", vi: "Đây là trường hợp khẩn cấp",
    th: "นี่คือเหตุฉุกเฉิน", tr: "Bu bir acil durum", he: "זה מצב חירום",
    sw: "Hii ni dharura", so: "Kani waa xaalad degdeg ah", am: "ይህ ድንገተኛ ጉዳይ ነው",
    ml: "ഇത് അടിയന്തരാവസ്ഥയാണ്", ta: "இது அவசர நிலை", te: "ఇది అత్యవసర పరిస్థితి",
    ne: "यो आपतकालीन अवस्था हो", my: "ဒါ အရေးပေါ်ဖြစ်ပါတယ်", ht: "Sa se yon ijans",
  } as Translations },
  { id: "nauseous", medicalTerms: ["nausea"], aliases: { en: ["I am nauseous"] }, translations: {
    en: "I feel nauseous", ar: "أشعر بالغثيان", hi: "मुझे मितली आ रही है", ur: "مجھے متلی ہو رہی ہے",
    bn: "আমার বমি বমি লাগছে", tl: "Nasusuka ako", fa: "حالت تهوع دارم",
    es: "Tengo náuseas", fr: "J'ai la nausée",
    de: "Mir ist übel", ru: "Меня тошнит", uk: "Мене нудить", it: "Ho la nausea", pl: "Mam mdłości",
    pt: "Estou com náusea", zh: "我感到恶心", ja: "吐き気がします", ko: "메스꺼움을 느낍니다",
    vi: "Tôi buồn nôn", th: "ฉันคลื่นไส้", tr: "Midem bulanıyor", he: "יש לי בחילה",
    sw: "Ninahisi kichefuchefu", so: "Waxaan dareemayaa lallabo", am: "ማቅለሽለሽ ይሰማኛል",
    ml: "എനിക്ക് ഓക്കാനം വരുന്നു", ta: "எனக்கு குமட்டலாக இருக்கிறது", te: "నాకు వాంతి వస్తోంది",
    ne: "मलाई वाकवाकी लागेको छ", my: "ပျို့ချင်နေပါတယ်", ht: "Mwen gen anvi vomi",
  } as Translations },
  { id: "bathroom", translations: {
    en: "Where is the bathroom?", ar: "أين الحمام؟", hi: "बाथरूम कहाँ है?", ur: "باتھ روم کہاں ہے؟",
    bn: "বাথরুম কোথায়?", tl: "Nasaan ang banyo?", fa: "دستشویی کجاست؟",
    es: "¿Dónde está el baño?", fr: "Où sont les toilettes ?",
    de: "Wo ist die Toilette?", ru: "Где туалет?", uk: "Де туалет?", it: "Dov'è il bagno?",
    pl: "Gdzie jest toaleta?", pt: "Onde fica o banheiro?", zh: "洗手间在哪里？",
    ja: "トイレはどこですか？", ko: "화장실이 어디에 있습니까?", vi: "Nhà vệ sinh ở đâu?",
    th: "ห้องน้ำอยู่ที่ไหน?", tr: "Tuvalet nerede?", he: "?איפה השירותים",
    sw: "Choo kiko wapi?", so: "Musqusha xagee ayuu ku yaalaa?", am: "መጸዳጃ ቤት የት ነው?",
    ml: "ബാത്ത്‌റൂം എവിടെയാണ്?", ta: "கழிவறை எங்கே?", te: "బాత్‌రూం ఎక్కడ?",
    ne: "शौचालय कहाँ छ?", my: "အိမ်သာ ဘယ်မှာလဲ?", ht: "Kote twalèt la ye?",
  } as Translations },
  { id: "water", aliases: { en: ["I need water please"] }, translations: {
    en: "I need water", ar: "أحتاج إلى ماء", hi: "मुझे पानी चाहिए", ur: "مجھے پانی چاہیے",
    bn: "আমার পানি দরকার", tl: "Kailangan ko ng tubig", fa: "آب می‌خواهم",
    es: "Necesito agua", fr: "J'ai besoin d'eau",
    de: "Ich brauche Wasser", ru: "Мне нужна вода", uk: "Мені потрібна вода",
    it: "Ho bisogno di acqua", pl: "Potrzebuję wody", pt: "Preciso de água",
    zh: "我需要水", ja: "水が必要です", ko: "물이 필요합니다", vi: "Tôi cần nước",
    th: "ฉันต้องการน้ำ", tr: "Suya ihtiyacım var", he: "אני צריך מים",
    sw: "Ninahitaji maji", so: "Biyo baan u baahanahay", am: "ውሃ እፈልጋለሁ",
    ml: "എനിക്ക് വെള്ളം വേണം", ta: "எனக்கு தண்ணீர் தேவை", te: "నాకు నీళ్ళు కావాలి",
    ne: "मलाई पानी चाहिन्छ", my: "ရေ လိုပါတယ်", ht: "Mwen bezwen dlo",
  } as Translations },
  { id: "allergic", medicalTerms: ["allergy"], aliases: { en: ["I have allergies"] }, translations: {
    en: "I am allergic", ar: "لدي حساسية", hi: "मुझे एलर्जी है", ur: "مجھے الرجی ہے",
    bn: "আমার অ্যালার্জি আছে", tl: "May allergy ako", fa: "آلرژی دارم",
    es: "Tengo alergia", fr: "Je suis allergique",
    de: "Ich bin allergisch", ru: "У меня аллергия", uk: "У мене алергія",
    it: "Sono allergico", pl: "Mam alergię", pt: "Sou alérgico",
    zh: "我有过敏", ja: "アレルギーがあります", ko: "알레르기가 있습니다", vi: "Tôi bị dị ứng",
    th: "ฉันแพ้", tr: "Alerjim var", he: "יש לי אלרגיה",
    sw: "Nina mzio", so: "Xasaasiyadeed baan qabaa", am: "አለርጂ አለብኝ",
    ml: "എനിക്ക് അലർജിയുണ്ട്", ta: "எனக்கு ஒவ்வாமை உள்ளது", te: "నాకు అలెర్జీ ఉంది",
    ne: "मलाई एलर्जी छ", my: "ဓာတ်မတည့်ပါ", ht: "Mwen gen alèji",
  } as Translations },
  { id: "fever", medicalTerms: ["fever"], translations: {
    en: "I have a fever", ar: "لدي حمى", hi: "मुझे बुखार है", ur: "مجھے بخار ہے",
    bn: "আমার জ্বর আছে", tl: "May lagnat ako", fa: "تب دارم",
    es: "Tengo fiebre", fr: "J'ai de la fièvre",
    de: "Ich habe Fieber", ru: "У меня температура", uk: "У мене гарячка",
    it: "Ho la febbre", pl: "Mam gorączkę", pt: "Estou com febre",
    zh: "我发烧了", ja: "熱があります", ko: "열이 있습니다", vi: "Tôi bị sốt",
    th: "ฉันมีไข้", tr: "Ateşim var", he: "יש לי חום",
    sw: "Nina homa", so: "Qandho baan qabaa", am: "ትኩሳት አለብኝ",
    ml: "എനിക്ക് പനിയുണ്ട്", ta: "எனக்கு காய்ச்சல் உள்ளது", te: "నాకు జ్వరం ఉంది",
    ne: "मलाई ज्वरो आएको छ", my: "ကျွန်တော် ဖျားနေပါတယ်", ht: "Mwen gen lafyèv",
  } as Translations },
  { id: "dizzy", medicalTerms: ["dizziness"], aliases: { en: ["I am dizzy"] }, translations: {
    en: "I feel dizzy", ar: "أشعر بالدوار", hi: "मुझे चक्कर आ रहे हैं", ur: "مجھے چکر آ رہے ہیں",
    bn: "আমার মাথা ঘুরছে", tl: "Nahihilo ako", fa: "سرگیجه دارم",
    es: "Tengo mareo", fr: "J'ai des vertiges",
    de: "Mir ist schwindelig", ru: "У меня головокружение", uk: "У мене запаморочення",
    it: "Ho le vertigini", pl: "Kręci mi się w głowie", pt: "Estou com tontura",
    zh: "我感觉头晕", ja: "めまいがします", ko: "어지러움을 느낍니다", vi: "Tôi bị chóng mặt",
    th: "ฉันเวียนศีรษะ", tr: "Başım dönüyor", he: "יש לי סחרחורת",
    sw: "Ninahisi kizunguzungu", so: "Dawakhad baan dareemayaa", am: "ራሴ ይዞረኛል",
    ml: "എനിക്ക് തലകറക്കം വരുന്നു", ta: "எனக்கு தலைச்சுற்றல் உள்ளது", te: "నాకు తలతిరుగుతోంది",
    ne: "मलाई रिंगटा लागेको छ", my: "ခေါင်းမူးနေပါတယ်", ht: "Mwen santi tèt mwen ap vire",
  } as Translations },
  { id: "diabetic", medicalTerms: ["diabetes"], aliases: { en: ["I have diabetes"] }, translations: {
    en: "I am diabetic", ar: "لدي داء السكري", hi: "मुझे मधुमेह है", ur: "مجھے ذیابیطس ہے",
    bn: "আমার ডায়াবেটিস আছে", tl: "May diabetes ako", fa: "دیابت دارم",
    es: "Tengo diabetes", fr: "Je suis diabétique",
    de: "Ich bin Diabetiker", ru: "У меня диабет", uk: "У мене діабет",
    it: "Sono diabetico", pl: "Mam cukrzycę", pt: "Sou diabético",
    zh: "我有糖尿病", ja: "糖尿病です", ko: "당뇨가 있습니다", vi: "Tôi bị tiểu đường",
    th: "ฉันเป็นเบาหวาน", tr: "Şeker hastasıyım", he: "יש לי סוכרת",
    sw: "Nina kisukari", so: "Sonkorow baan qabaa", am: "የስኳር ህመም አለብኝ",
    ml: "എനിക്ക് പ്രമേഹമുണ്ട്", ta: "எனக்கு நீரிழிவு நோய் உள்ளது", te: "నాకు మధుమేహం ఉంది",
    ne: "मलाई मधुमेह छ", my: "ကျွန်တော် ဆီးချိုရှိပါတယ်", ht: "Mwen gen dyabèt",
  } as Translations },
  { id: "call_family", translations: {
    en: "Call my family please", ar: "يرجى الاتصال بعائلتي", hi: "कृपया मेरे परिवार को फोन करें",
    ur: "براہ کرم میرے خاندان کو فون کریں", bn: "দয়া করে আমার পরিবারকে ফোন করুন",
    tl: "Pakiusap, tawagan ang pamilya ko", fa: "لطفاً به خانواده‌ام زنگ بزنید",
    es: "Llame a mi familia, por favor", fr: "Veuillez appeler ma famille",
    de: "Bitte rufen Sie meine Familie an", ru: "Позвоните моей семье, пожалуйста",
    uk: "Зателефонуйте моїй родині, будь ласка", it: "Per favore chiamate la mia famiglia",
    pl: "Proszę zadzwonić do mojej rodziny", pt: "Por favor, ligue para minha família",
    zh: "请联系我的家人", ja: "家族に連絡してください", ko: "가족에게 연락해 주세요",
    vi: "Xin hãy gọi cho gia đình tôi", th: "กรุณาโทรหาครอบครัวของฉัน",
    tr: "Lütfen ailemi arayın", he: "בבקשה התקשרו למשפחה שלי",
    sw: "Tafadhali wapigie familia yangu", so: "Fadlan qoyskaygii u wac",
    am: "እባክዎ ቤተሰቤን ይደውሉ", ml: "ദയവായി എന്റെ കുടുംബത്തെ വിളിക്കൂ",
    ta: "தயவுசெய்து என் குடும்பத்தை அழைக்கவும்", te: "దయచేసి నా కుటుంబానికి కాల్ చేయండి",
    ne: "कृपया मेरो परिवारलाई फोन गर्नुहोस्", my: "ကျေးဇူးပြု၍ မိသားစုကို ဖုန်းဆက်ပေးပါ",
    ht: "Tanpri rele fanmi mwen",
  } as Translations },
  { id: "chest_pain", emergency: true, medicalTerms: ["chest pain"], aliases: { en: ["Chest pain"] }, translations: {
    en: "I have chest pain", ar: "لدي ألم في الصدر", hi: "मेरे सीने में दर्द है", ur: "میرے سینے میں درد ہے",
    bn: "আমার বুকে ব্যথা হচ্ছে", tl: "Masakit ang dibdib ko", fa: "درد قفسه سینه دارم",
    es: "Tengo dolor en el pecho", fr: "J'ai mal à la poitrine",
    de: "Ich habe Brustschmerzen", ru: "У меня боль в груди", uk: "У мене біль у грудях",
    it: "Ho dolore al petto", pl: "Boli mnie w klatce piersiowej", pt: "Estou com dor no peito",
    zh: "我胸口疼", ja: "胸が痛いです", ko: "가슴이 아픕니다", vi: "Tôi bị đau ngực",
    th: "ฉันเจ็บหน้าอก", tr: "Göğsümde ağrı var", he: "יש לי כאב בחזה",
    sw: "Nina maumivu ya kifua", so: "Xanuunka laabta ayaa i haysa", am: "ደረቴ ያመኛል",
    ml: "എനിക്ക് നെഞ്ചുവേദനയുണ്ട്", ta: "எனக்கு நெஞ்சு வலி உள்ளது", te: "నాకు ఛాతీ నొప్పి ఉంది",
    ne: "मेरो छातीमा दुखेको छ", my: "ရင်ဘတ် နာကျင်နေပါတယ်", ht: "Mwen gen doulè nan pwatrin",
  } as Translations },
  { id: "cant_breathe", emergency: true, medicalTerms: ["breathing"], aliases: { en: ["I cannot breathe", "Cannot breathe", "Can't breathe"] }, translations: {
    en: "I can't breathe", ar: "لا أستطيع التنفس", hi: "मुझे सांस नहीं आ रही है", ur: "مجھے سانس نہیں آ رہی",
    bn: "আমি শ্বাস নিতে পারছি না", tl: "Hindi ako makahinga", fa: "نمی‌توانم نفس بکشم",
    es: "No puedo respirar", fr: "Je n'arrive pas à respirer",
    de: "Ich kann nicht atmen", ru: "Я не могу дышать", uk: "Я не можу дихати",
    it: "Non riesco a respirare", pl: "Nie mogę oddychać", pt: "Não consigo respirar",
    zh: "我无法呼吸", ja: "息ができません", ko: "숨을 쉴 수 없어요", vi: "Tôi không thở được",
    th: "ฉันหายใจไม่ออก", tr: "Nefes alamıyorum", he: "אני לא יכול לנשום",
    sw: "Siwezi kupumua", so: "Ma neefi karo", am: "መተንፈስ አልችልም",
    ml: "എനിക്ക് ശ്വസിക്കാൻ കഴിയുന്നില്ല", ta: "என்னால் மூச்சு விட முடியவில்லை",
    te: "నాకు ఊపిరి ఆడటం లేదు", ne: "मलाई सास फेर्न गाह्रो भइरहेको छ",
    my: "အသက်မရှူနိုင်ပါ", ht: "Mwen pa kapab respire",
  } as Translations },
  { id: "pain_here", translations: {
    en: "The pain is here", ar: "الألم هنا", hi: "दर्द यहाँ है", ur: "درد یہاں ہے",
    bn: "ব্যথা এখানে", tl: "Dito ang sakit", fa: "درد اینجاست",
    es: "El dolor está aquí", fr: "La douleur est ici",
    de: "Der Schmerz ist hier", ru: "Боль здесь", uk: "Біль тут", it: "Il dolore è qui",
    pl: "Ból jest tutaj", pt: "A dor é aqui", zh: "疼痛在这里", ja: "痛みはここです",
    ko: "여기가 아픕니다", vi: "Đau ở đây", th: "เจ็บตรงนี้", tr: "Ağrı burada",
    he: "הכאב כאן", sw: "Maumivu yako hapa", so: "Xanuunka halkan ayuu ku yaalaa",
    am: "ህመሙ እዚህ ነው", ml: "വേദന ഇവിടെയാണ്", ta: "வலி இங்கே உள்ளது", te: "నొప్పి ఇక్కడ ఉంది",
    ne: "दुखाइ यहाँ छ", my: "နာတာ ဒီမှာပါ", ht: "Doulè a se la li ye",
  } as Translations },
  { id: "pain_severe", emergency: true, medicalTerms: ["severe pain"], translations: {
    en: "The pain is severe", ar: "الألم شديد", hi: "दर्द बहुत तेज़ है", ur: "درد بہت شدید ہے",
    bn: "ব্যথা খুব তীব্র", tl: "Matindi ang sakit", fa: "درد شدید است",
    es: "El dolor es muy intenso", fr: "La douleur est très forte",
    de: "Die Schmerzen sind sehr stark", ru: "Боль очень сильная", uk: "Біль дуже сильний",
    it: "Il dolore è molto forte", pl: "Ból jest bardzo silny", pt: "A dor é muito forte",
    zh: "疼痛非常严重", ja: "痛みがとても強いです", ko: "통증이 매우 심합니다",
    vi: "Đau rất nặng", th: "เจ็บปวดมาก", tr: "Ağrı çok şiddetli", he: "הכאב חזק מאוד",
    sw: "Maumivu ni makali sana", so: "Xanuunka aad ayuu u daran yahay", am: "ህመሙ በጣም ከባድ ነው",
    ml: "വേദന വളരെ കഠിനമാണ്", ta: "வலி மிகவும் கடுமையாக உள்ளது", te: "నొప్పి చాలా తీవ్రంగా ఉంది",
    ne: "दुखाइ धेरै तीव्र छ", my: "အလွန် နာကျင်ပါတယ်", ht: "Doulè a grav anpil",
  } as Translations },
  { id: "pregnant", medicalTerms: ["pregnant"], translations: {
    en: "I am pregnant", ar: "أنا حامل", hi: "मैं गर्भवती हूँ", ur: "میں حاملہ ہوں",
    bn: "আমি গর্ভবতী", tl: "Buntis ako", fa: "باردار هستم",
    es: "Estoy embarazada", fr: "Je suis enceinte",
    de: "Ich bin schwanger", ru: "Я беременна", uk: "Я вагітна", it: "Sono incinta",
    pl: "Jestem w ciąży", pt: "Estou grávida", zh: "我怀孕了", ja: "妊娠しています",
    ko: "임신 중입니다", vi: "Tôi đang mang thai", th: "ฉันตั้งครรภ์",
    tr: "Hamileyim", he: "אני בהריון", sw: "Nina mimba", so: "Waan uurka leh ahay",
    am: "እርጉዝ ነኝ", ml: "ഞാൻ ഗർഭിണിയാണ്", ta: "நான் கர்ப்பமாக இருக்கிறேன்",
    te: "నేను గర్భవతిని", ne: "म गर्भवती छु", my: "ကိုယ်ဝန်ရှိပါတယ်", ht: "Mwen ansent",
  } as Translations },
  { id: "penicillin", medicalTerms: ["penicillin", "allergy"], translations: {
    en: "I am allergic to penicillin", ar: "لدي حساسية من البنسلين", hi: "मुझे पेनिसिलिन से एलर्जी है",
    ur: "مجھے پینسلین سے الرجی ہے", bn: "আমার পেনিসিলিনে অ্যালার্জি আছে",
    tl: "Allergic ako sa penicillin", fa: "به پنی‌سیلین حساسیت دارم",
    es: "Tengo alergia a la penicilina", fr: "Je suis allergique à la pénicilline",
    de: "Ich bin allergisch gegen Penicillin", ru: "У меня аллергия на пенициллин",
    uk: "У мене алергія на пеніцилін", it: "Sono allergico alla penicillina",
    pl: "Mam alergię na penicylinę", pt: "Sou alérgico a penicilina",
    zh: "我对青霉素过敏", ja: "ペニシリンにアレルギーがあります", ko: "페니실린 알레르기가 있습니다",
    vi: "Tôi dị ứng penicillin", th: "ฉันแพ้เพนิซิลลิน", tr: "Penisiline alerjim var",
    he: "יש לי אלרגיה לפניצילין", sw: "Nina mzio wa penicillin", so: "Xasaasiyadeed penicillin baan qabaa",
    am: "ለፔኒሲሊን አለርጂ አለብኝ", ml: "എനിക്ക് പെൻസിലിൻ അലർജിയുണ്ട്",
    ta: "எனக்கு பெனிசிலின் ஒவ்வாமை உள்ளது", te: "నాకు పెనిసిలిన్ అలెర్జీ ఉంది",
    ne: "मलाई पेनिसिलिनको एलर्जी छ", my: "ပဲနစ်ဆလင် ဓာတ်မတည့်ပါ",
    ht: "Mwen gen alèji ak penisilin",
  } as Translations },
  { id: "insulin", medicalTerms: ["insulin"], translations: {
    en: "I take insulin", ar: "أستخدم الإنسولين", hi: "मैं इंसुलिन लेता/लेती हूँ",
    ur: "میں انسولین استعمال کرتا/کرتی ہوں", bn: "আমি ইনসুলিন নিই",
    tl: "Gumagamit ako ng insulin", fa: "انسولین مصرف می‌کنم",
    es: "Uso insulina", fr: "Je prends de l'insuline",
    de: "Ich nehme Insulin", ru: "Я принимаю инсулин", uk: "Я приймаю інсулін",
    it: "Prendo insulina", pl: "Przyjmuję insulinę", pt: "Eu tomo insulina",
    zh: "我使用胰岛素", ja: "インスリンを使用しています", ko: "인슐린을 맞고 있습니다",
    vi: "Tôi dùng insulin", th: "ฉันฉีดอินซูลิน", tr: "İnsülin kullanıyorum",
    he: "אני לוקח אינסולין", sw: "Ninatumia insulini", so: "Insuliin baan qaataa",
    am: "ኢንሱሊን እወስዳለሁ", ml: "ഞാൻ ഇൻസുലിൻ എടുക്കുന്നു", ta: "நான் இன்சுலின் எடுக்கிறேன்",
    te: "నేను ఇన్సులిన్ వాడుతున్నాను", ne: "म इन्सुलिन लिन्छु", my: "အင်ဆူလင် ထိုးနေပါတယ်",
    ht: "Mwen pran ensilin",
  } as Translations },
  { id: "yes", translations: {
    en: "Yes", ar: "نعم", hi: "हाँ", ur: "جی ہاں", bn: "হ্যাঁ", tl: "Oo", fa: "بله",
    es: "Sí", fr: "Oui", de: "Ja", ru: "Да", uk: "Так", it: "Sì", pl: "Tak", pt: "Sim",
    zh: "是", ja: "はい", ko: "네", vi: "Có", th: "ใช่", tr: "Evet", he: "כן",
    sw: "Ndiyo", so: "Haa", am: "አዎ", ml: "അതെ", ta: "ஆம்", te: "అవును", ne: "हो",
    my: "ဟုတ်ကဲ့", ht: "Wi",
  } as Translations },
  { id: "no", translations: {
    en: "No", ar: "لا", hi: "नहीं", ur: "نہیں", bn: "না", tl: "Hindi", fa: "نه",
    es: "No", fr: "Non", de: "Nein", ru: "Нет", uk: "Ні", it: "No", pl: "Nie", pt: "Não",
    zh: "不是", ja: "いいえ", ko: "아니요", vi: "Không", th: "ไม่", tr: "Hayır", he: "לא",
    sw: "Hapana", so: "Maya", am: "አይ", ml: "ഇല്ല", ta: "இல்லை", te: "కాదు", ne: "होइन",
    my: "မဟုတ်ပါ", ht: "Non",
  } as Translations },
  { id: "dont_understand", translations: {
    en: "I don't understand", ar: "لا أفهم", hi: "मैं समझ नहीं पा रहा/रही हूँ", ur: "میں نہیں سمجھ رہا/رہی",
    bn: "আমি বুঝতে পারছি না", tl: "Hindi ko naiintindihan", fa: "متوجه نمی‌شوم",
    es: "No entiendo", fr: "Je ne comprends pas",
    de: "Ich verstehe nicht", ru: "Я не понимаю", uk: "Я не розумію", it: "Non capisco",
    pl: "Nie rozumiem", pt: "Não entendo", zh: "我不明白", ja: "わかりません", ko: "이해하지 못합니다",
    vi: "Tôi không hiểu", th: "ฉันไม่เข้าใจ", tr: "Anlamıyorum", he: "אני לא מבין",
    sw: "Sielewi", so: "Ma fahmin", am: "አልገባኝም", ml: "എനിക്ക് മനസ്സിലാകുന്നില്ല",
    ta: "எனக்கு புரியவில்லை", te: "నాకు అర్థం కావటం లేదు", ne: "मलाई बुझिएन",
    my: "နားမလည်ပါ", ht: "Mwen pa konprann",
  } as Translations },
  { id: "point_pain", translations: {
    en: "Point to where it hurts", ar: "أشر إلى مكان الألم", hi: "जहाँ दर्द है वहाँ इशारा करें",
    ur: "جہاں درد ہے وہاں اشارہ کریں", bn: "যেখানে ব্যথা সেখানে দেখান",
    tl: "Ituro kung saan masakit", fa: "به جایی که درد دارد اشاره کنید",
    es: "Señale dónde le duele", fr: "Montrez où vous avez mal",
    de: "Zeigen Sie, wo es weh tut", ru: "Покажите, где болит", uk: "Покажіть, де болить",
    it: "Indichi dove fa male", pl: "Proszę wskazać, gdzie boli", pt: "Aponte onde dói",
    zh: "请指出哪里疼", ja: "痛い場所を指してください", ko: "아픈 곳을 가리켜 주세요",
    vi: "Chỉ chỗ nào đau", th: "ชี้ตรงที่เจ็บ", tr: "Ağrıyan yeri gösterin",
    he: "הצביעו על המקום שכואב", sw: "Onyesha mahali panapouuma",
    so: "Fiiri halka ay ku xanuunsanayso", am: "የሚያመውን ቦታ ያሳዩ",
    ml: "വേദനിക്കുന്ന ഇടം ചൂണ്ടിക്കാണിക്കൂ", ta: "வலிக்கும் இடத்தைக் காட்டுங்கள்",
    te: "నొప్పి ఉన్న చోటు చూపించండి", ne: "दुखेको ठाउँ देखाउनुहोस्",
    my: "နာတဲ့နေရာကို ထောက်ပြပါ", ht: "Montre kote li fè mal",
  } as Translations },
  { id: "when_started", translations: {
    en: "When did this start?", ar: "متى بدأ هذا؟", hi: "यह कब शुरू हुआ?", ur: "یہ کب شروع ہوا؟",
    bn: "এটা কখন শুরু হয়েছে?", tl: "Kailan ito nagsimula?", fa: "این از چه زمانی شروع شد؟",
    es: "¿Cuándo empezó esto?", fr: "Quand cela a-t-il commencé ?",
    de: "Wann hat das angefangen?", ru: "Когда это началось?", uk: "Коли це почалося?",
    it: "Quando è iniziato?", pl: "Kiedy to się zaczęło?", pt: "Quando isso começou?",
    zh: "什么时候开始的？", ja: "いつ始まりましたか？", ko: "언제 시작되었습니까?",
    vi: "Khi nào bắt đầu?", th: "เริ่มเมื่อไหร่?", tr: "Ne zaman başladı?", he: "?מתי זה התחיל",
    sw: "Hii ilianza lini?", so: "Goormay bilowday?", am: "ይህ መቼ ጀመረ?",
    ml: "ഇത് എപ്പോൾ തുടങ്ങി?", ta: "இது எப்போது தொடங்கியது?", te: "ఇది ఎప్పుడు మొదలైంది?",
    ne: "यो कहिले सुरु भयो?", my: "ဒါ ဘယ်တော့ စတာလဲ?", ht: "Ki lè sa te kòmanse?",
  } as Translations },
  { id: "breathing_question", emergency: true, medicalTerms: ["breathing"], translations: {
    en: "Are you having trouble breathing?", ar: "هل لديك صعوبة في التنفس؟",
    hi: "क्या आपको सांस लेने में तकलीफ़ है?", ur: "کیا آپ کو سانس لینے میں دقت ہے؟",
    bn: "আপনার কি শ্বাস নিতে কষ্ট হচ্ছে?", tl: "Nahihirapan ka bang huminga?",
    fa: "آیا در تنفس مشکل دارید؟", es: "¿Tiene dificultad para respirar?",
    fr: "Avez-vous du mal à respirer ?",
    de: "Haben Sie Atemnot?", ru: "Вам трудно дышать?", uk: "Вам важко дихати?",
    it: "Ha difficoltà a respirare?", pl: "Czy ma Pan/Pani problemy z oddychaniem?",
    pt: "Está com dificuldade para respirar?", zh: "您呼吸困难吗？", ja: "呼吸が苦しいですか？",
    ko: "호흡이 어렵습니까?", vi: "Bạn có khó thở không?", th: "คุณหายใจลำบากไหม?",
    tr: "Nefes almakta güçlük çekiyor musunuz?", he: "?האם אתם מתקשים לנשום",
    sw: "Je, una shida kupumua?", so: "Ma ku adkaanayaa neefsashada?",
    am: "መተንፈስ ይቸግርዎታል?", ml: "ശ്വസിക്കാൻ ബുദ്ധിമുട്ടുണ്ടോ?",
    ta: "மூச்சு விடுவதில் சிரமம் உள்ளதா?", te: "ఊపిరి తీసుకోవడంలో ఇబ్బంది ఉందా?",
    ne: "सास फेर्न गाह्रो भइरहेको छ?", my: "အသက်ရှူရ ခက်ခဲနေပါသလား?",
    ht: "Èske ou gen pwoblèm pou respire?",
  } as Translations },
  { id: "medicine_allergy_question", medicalTerms: ["medicine", "allergy"], translations: {
    en: "Are you allergic to any medicine?", ar: "هل لديك حساسية من أي دواء؟",
    hi: "क्या आपको किसी दवा से एलर्जी है?", ur: "کیا آپ کو کسی دوا سے الرجی ہے؟",
    bn: "আপনার কি কোনো ওষুধে অ্যালার্জি আছে?", tl: "Allergic ka ba sa anumang gamot?",
    fa: "آیا به دارویی حساسیت دارید؟", es: "¿Tiene alergia a algún medicamento?",
    fr: "Êtes-vous allergique à un médicament ?",
    de: "Sind Sie gegen ein Medikament allergisch?", ru: "У вас аллергия на какое-либо лекарство?",
    uk: "У вас є алергія на якісь ліки?", it: "È allergico a qualche farmaco?",
    pl: "Czy jest Pan/Pani uczulony/a na jakiś lek?", pt: "Tem alergia a algum medicamento?",
    zh: "您对任何药物过敏吗？", ja: "何かの薬にアレルギーはありますか？",
    ko: "약물 알레르기가 있습니까?", vi: "Bạn có dị ứng thuốc nào không?",
    th: "คุณแพ้ยาอะไรไหม?", tr: "Herhangi bir ilaca alerjiniz var mı?",
    he: "?האם יש לך אלרגיה לתרופה כלשהי", sw: "Je, una mzio wa dawa yoyote?",
    so: "Dawo kasta xasaasiyadeed ma ku leedahay?", am: "ለማንኛውም መድኃኒት አለርጂ አለብዎ?",
    ml: "ഏതെങ്കിലും മരുന്നിനോട് അലർജിയുണ്ടോ?", ta: "ஏதேனும் மருந்துக்கு ஒவ்வாமை உள்ளதா?",
    te: "ఏదైనా మందుకు అలెర్జీ ఉందా?", ne: "कुनै औषधिमा एलर्जी छ?",
    my: "ဆေးတစ်မျိုးမျိုး ဓာတ်မတည့်ပါသလား?", ht: "Èske ou gen alèji ak nenpòt medikaman?",
  } as Translations },
  { id: "medicines_question", medicalTerms: ["medicines"], translations: {
    en: "What medicines do you take?", ar: "ما الأدوية التي تتناولها؟",
    hi: "आप कौन सी दवाएँ लेते हैं?", ur: "آپ کون سی دوائیں لیتے ہیں؟",
    bn: "আপনি কোন ওষুধ খান?", tl: "Anong mga gamot ang iniinom mo?",
    fa: "چه داروهایی مصرف می‌کنید؟", es: "¿Qué medicamentos toma?",
    fr: "Quels médicaments prenez-vous ?",
    de: "Welche Medikamente nehmen Sie?", ru: "Какие лекарства вы принимаете?",
    uk: "Які ліки ви приймаєте?", it: "Quali farmaci assume?",
    pl: "Jakie leki Pan/Pani przyjmuje?", pt: "Que medicamentos você toma?",
    zh: "您服用什么药物？", ja: "どんな薬を飲んでいますか？", ko: "어떤 약을 복용하고 계십니까?",
    vi: "Bạn đang uống thuốc gì?", th: "คุณทานยาอะไรอยู่?",
    tr: "Hangi ilaçları kullanıyorsunuz?", he: "?אילו תרופות אתם לוקחים",
    sw: "Unatumia dawa gani?", so: "Dawo noocee ah ayaad qaadataa?", am: "ምን መድኃኒት ይወስዳሉ?",
    ml: "എന്ത് മരുന്നുകൾ കഴിക്കുന്നു?", ta: "என்ன மருந்துகள் எடுக்கிறீர்கள்?",
    te: "మీరు ఏ మందులు వాడుతున్నారు?", ne: "कुन औषधि लिनुहुन्छ?",
    my: "ဘာဆေးတွေ သောက်နေပါသလဲ?", ht: "Ki medikaman w ap pran?",
  } as Translations },
  { id: "help_coming", translations: {
    en: "Help is coming", ar: "المساعدة في الطريق", hi: "मदद आ रही है", ur: "مدد آ رہی ہے",
    bn: "সাহায্য আসছে", tl: "Paparating na ang tulong", fa: "کمک در راه است",
    es: "La ayuda viene en camino", fr: "De l'aide arrive",
    de: "Hilfe kommt", ru: "Помощь уже идёт", uk: "Допомога вже йде",
    it: "L'aiuto sta arrivando", pl: "Pomoc nadchodzi", pt: "A ajuda está a caminho",
    zh: "帮助马上就到", ja: "助けが来ます", ko: "도움이 오고 있습니다",
    vi: "Sự giúp đỡ đang đến", th: "ความช่วยเหลือกำลังมา", tr: "Yardım geliyor",
    he: "עזרה בדרך", sw: "Msaada unakuja", so: "Caawimaad way imanaysaa", am: "እርዳታ እየመጣ ነው",
    ml: "സഹായം വരുന്നു", ta: "உதவி வருகிறது", te: "సహాయం వస్తోంది",
    ne: "सहायता आउँदैछ", my: "အကူအညီ လာနေပါပြီ", ht: "Èd ap vini",
  } as Translations },
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
    return Array.isArray(parsed) ? parsed : [];
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

export function getPhraseTextById(phraseId: string, lang: string): string | null {
  const code = resolvePhrasebookLanguage(lang);
  if (!code) return null;
  const entry = OFFLINE_PHRASEBOOK.find((p) => p.id === phraseId);
  return entry?.translations[code] ?? null;
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
