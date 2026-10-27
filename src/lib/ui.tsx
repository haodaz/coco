"use client";

import { createContext, useContext } from "react";
import { matchLang } from "./i18n";
import { ZH } from "./zh";

// The app's own words in the owner's language. Strings are written in English in the code and looked up here;
// {name} placeholders are filled in after. Anything not translated yet shows in English.

type Vars = Record<string, string | number>;
const DICTS: Record<string, Record<string, string>> = { "zh-Hans": ZH, "zh-Hant": ZH };

export function translate(lang: string, s: string, vars?: Vars) {
  const out = DICTS[lang]?.[s] ?? s;
  return vars ? out.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : out;
}

export const browserLang = () => (typeof navigator === "undefined" ? "en" : matchLang(navigator.language));

type Ctx = { lang: string; t: (s: string, vars?: Vars) => string; setLang: (l: string) => void };
const LangContext = createContext<Ctx | null>(null);
export const LangProvider = LangContext.Provider;

// outside the workspace (sign-in) it follows the browser
export function useT(): Ctx {
  const c = useContext(LangContext);
  if (c) return c;
  const lang = browserLang();
  return { lang, t: (s, v) => translate(lang, s, v), setLang: () => {} };
}
