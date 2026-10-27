// Languages. Two things follow the owner's language: the app's words (menus, buttons, help) and everything the AI
// writes for people (card names and lines, what it noticed, the soul portrait). The AI's own notes (trace labels,
// the painting scene) stay in English so tags, series and tasks work the same in every language.
// The app's words exist in English and Simplified Chinese so far; any other language gets English app words and
// AI writing in that language.

export const LANGS: { code: string; label: string; name: string }[] = [
  { code: "en", label: "English", name: "English" },
  { code: "zh-Hans", label: "简体中文", name: "Simplified Chinese" },
  { code: "zh-Hant", label: "繁體中文", name: "Traditional Chinese" },
  { code: "ja", label: "日本語", name: "Japanese" },
  { code: "ko", label: "한국어", name: "Korean" },
  { code: "es", label: "Español", name: "Spanish" },
  { code: "fr", label: "Français", name: "French" },
  { code: "de", label: "Deutsch", name: "German" },
  { code: "pt", label: "Português", name: "Portuguese" },
  { code: "it", label: "Italiano", name: "Italian" },
];

export const languageName = (code?: string | null) => LANGS.find((l) => l.code === code)?.name ?? "English";

// the closest supported language for a browser locale ("zh-CN" → "zh-Hans", "zh-TW" → "zh-Hant", "es-MX" → "es")
export function matchLang(locale?: string | null): string {
  const l = (locale ?? "en").toLowerCase();
  if (l.startsWith("zh")) return /tw|hk|mo|hant/.test(l) ? "zh-Hant" : "zh-Hans";
  return LANGS.find((x) => l.startsWith(x.code))?.code ?? "en";
}
