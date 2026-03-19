import { Language } from "@/types";

export const languages: Language[] = [
  // ── Kuwait essentials ──
  { code: "ar", label: "Arabic", nativeLabel: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\u{1F1F0}\u{1F1FC}", dir: "rtl" },
  { code: "en", label: "English", nativeLabel: "English", flag: "\u{1F1EC}\u{1F1E7}" },

  // ── South Asian (largest expat groups in Kuwait) ──
  { code: "hi", label: "Hindi", nativeLabel: "\u0939\u093F\u0928\u094D\u0926\u0940", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ur", label: "Urdu", nativeLabel: "\u0627\u0631\u062F\u0648", flag: "\u{1F1F5}\u{1F1F0}", dir: "rtl" },
  { code: "bn", label: "Bengali", nativeLabel: "\u09AC\u09BE\u0982\u09B2\u09BE", flag: "\u{1F1E7}\u{1F1E9}" },
  { code: "ml", label: "Malayalam", nativeLabel: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ta", label: "Tamil", nativeLabel: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "te", label: "Telugu", nativeLabel: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ne", label: "Nepali", nativeLabel: "\u0928\u0947\u092A\u093E\u0932\u0940", flag: "\u{1F1F3}\u{1F1F5}" },
  { code: "si", label: "Sinhala", nativeLabel: "\u0DC3\u0DD2\u0D82\u0DC4\u0DBD", flag: "\u{1F1F1}\u{1F1F0}" },
  { code: "tl", label: "Tagalog", nativeLabel: "Tagalog", flag: "\u{1F1F5}\u{1F1ED}" },

  // ── Middle Eastern / Persian / Turkish ──
  { code: "fa", label: "Farsi", nativeLabel: "\u0641\u0627\u0631\u0633\u06CC", flag: "\u{1F1EE}\u{1F1F7}", dir: "rtl" },
  { code: "ku", label: "Kurdish", nativeLabel: "\u06A9\u0648\u0631\u062F\u06CC", flag: "\u{1F1EE}\u{1F1F6}", dir: "rtl" },
  { code: "tr", label: "Turkish", nativeLabel: "T\u00fcrk\u00e7e", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "he", label: "Hebrew", nativeLabel: "\u05E2\u05D1\u05E8\u05D9\u05EA", flag: "\u{1F1EE}\u{1F1F1}", dir: "rtl" },

  // ── African ──
  { code: "am", label: "Amharic", nativeLabel: "\u12A0\u121B\u122D\u129B", flag: "\u{1F1EA}\u{1F1F9}" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "so", label: "Somali", nativeLabel: "Soomaali", flag: "\u{1F1F8}\u{1F1F4}" },

  // ── European ──
  { code: "fr", label: "French", nativeLabel: "Fran\u00e7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "es", label: "Spanish", nativeLabel: "Espa\u00f1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "ru", label: "Russian", nativeLabel: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "uk", label: "Ukrainian", nativeLabel: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "pl", label: "Polish", nativeLabel: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "pt", label: "Portuguese", nativeLabel: "Portugu\u00eas", flag: "\u{1F1E7}\u{1F1F7}" },

  // ── East & Southeast Asian ──
  { code: "zh", label: "Chinese (Simplified)", nativeLabel: "\u7B80\u4F53\u4E2D\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "zh-TW", label: "Chinese (Traditional)", nativeLabel: "\u7E41\u9AD4\u4E2D\u6587", flag: "\u{1F1F9}\u{1F1FC}" },
  { code: "ja", label: "Japanese", nativeLabel: "\u65E5\u672C\u8A9E", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "ko", label: "Korean", nativeLabel: "\uD55C\uAD6D\uC5B4", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Ti\u1EBFng Vi\u1EC7t", flag: "\u{1F1FB}\u{1F1F3}" },
  { code: "th", label: "Thai", nativeLabel: "\u0E44\u0E17\u0E22", flag: "\u{1F1F9}\u{1F1ED}" },
  { code: "my", label: "Burmese", nativeLabel: "\u1019\u103C\u1014\u103A\u1019\u102C\u1018\u102C\u101E\u102C", flag: "\u{1F1F2}\u{1F1F2}" },

  // ── Other ──
  { code: "ht", label: "Haitian Creole", nativeLabel: "Krey\u00f2l Ayisyen", flag: "\u{1F1ED}\u{1F1F9}" },
];

export function getLanguageByCode(code: string): Language | undefined {
  return languages.find((l) => l.code === code);
}
