import { Language } from "@/types";

export const languages: Language[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "es", label: "Spanish", nativeLabel: "Espa\u00f1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "ar", label: "Arabic", nativeLabel: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\u{1F1F8}\u{1F1E6}", dir: "rtl" },
  { code: "zh", label: "Chinese", nativeLabel: "\u4E2D\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "fr", label: "French", nativeLabel: "Fran\u00e7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "pt", label: "Portuguese", nativeLabel: "Portugu\u00eas", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "ru", label: "Russian", nativeLabel: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "hi", label: "Hindi", nativeLabel: "\u0939\u093F\u0928\u094D\u0926\u0940", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ko", label: "Korean", nativeLabel: "\uD55C\uAD6D\uC5B4", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Ti\u1EBFng Vi\u1EC7t", flag: "\u{1F1FB}\u{1F1F3}" },
  { code: "tl", label: "Tagalog", nativeLabel: "Tagalog", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
];

export function getLanguageByCode(code: string): Language | undefined {
  return languages.find((l) => l.code === code);
}
