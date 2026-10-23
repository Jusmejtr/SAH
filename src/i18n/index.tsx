import { createContext } from "preact";
import { useContext, useEffect, useMemo, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import en from "./locales/en";
import es from "./locales/es";
import de from "./locales/de";
import fr from "./locales/fr";
import pt from "./locales/pt";
import pl from "./locales/pl";
import hu from "./locales/hu";
import ru from "./locales/ru";
import ja from "./locales/ja";
import zh from "./locales/zh";
import { BACKEND_EXACT, BACKEND_PATTERNS } from "./backend";

type SourceKey = keyof typeof en;

/** Keys like "nav.accountsStored" that are stored as "_one" / "_other" forms. */
type PluralKey = SourceKey extends infer K
  ? K extends `${infer Base}_other`
    ? Base
    : never
  : never;

export type MessageKey = Exclude<SourceKey, `${string}_one` | `${string}_other`>;
export type TranslationKey = MessageKey | PluralKey;

/**
 * Every locale must contain all source keys. Extra keys are allowed for the
 * additional plural forms (_few, _many) some languages need.
 */
export type Messages = Record<SourceKey, string> & Record<string, string>;

export type Params = Record<string, string | number>;

export const LANGUAGES = [
  { code: "en", name: "English", messages: en as Messages },
  { code: "es", name: "Español", messages: es },
  { code: "de", name: "Deutsch", messages: de },
  { code: "fr", name: "Français", messages: fr },
  { code: "pt", name: "Português (Brasil)", messages: pt },
  { code: "pl", name: "Polski", messages: pl },
  { code: "hu", name: "Magyar", messages: hu },
  { code: "ru", name: "Русский", messages: ru },
  { code: "ja", name: "日本語", messages: ja },
  { code: "zh", name: "简体中文", messages: zh },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];
export type LanguagePreference = Language | "auto";

const LANGUAGE_KEY = "sah-language";
const DEFAULT_LANGUAGE: Language = "en";

const HTML_LANG: Record<Language, string> = {
  en: "en",
  es: "es",
  de: "de",
  fr: "fr",
  pt: "pt-BR",
  pl: "pl",
  hu: "hu",
  ru: "ru",
  ja: "ja",
  zh: "zh-CN",
};

const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.some((language) => language.code === value);

/** Picks the first supported language from the OS / browser preferences. */
export const detectLanguage = (): Language => {
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
};

const readPreference = (): LanguagePreference => {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === "auto" || isLanguage(stored)) return stored;
  } catch {
    // storage unavailable, fall back to auto-detection
  }
  return "auto";
};

const writePreference = (value: LanguagePreference) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {
    // not critical
  }
};

const format = (template: string, params?: Params) =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, name: string) =>
        params[name] !== undefined ? String(params[name]) : match,
      )
    : template;

export type Translate = (key: TranslationKey, params?: Params) => string;

export const createTranslator = (language: Language): Translate => {
  const messages =
    LANGUAGES.find((item) => item.code === language)?.messages ??
    (en as Messages);
  const fallback = en as Messages;
  const plural = new Intl.PluralRules(HTML_LANG[language]);

  return (key, params) => {
    let resolved: string = key;

    if (params && typeof params.count === "number") {
      const form = `${key}_${plural.select(params.count)}`;
      const other = `${key}_other`;
      if (form in messages) resolved = form;
      else if (other in messages) resolved = other;
    }

    const template = messages[resolved] ?? fallback[resolved] ?? key;
    return format(template, params);
  };
};

const stripIpcPrefix = (message: string) =>
  message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

/**
 * Turns a message produced by the Electron main process (errors, login
 * progress steps) into the current language. Messages that are not known are
 * shown as they are.
 */
export const createMessageLocalizer = (t: Translate) => (raw: unknown) => {
  if (raw === null || raw === undefined || raw === "") return "";
  const message = stripIpcPrefix(
    String(raw instanceof Error ? raw.message : raw),
  );

  const exact = BACKEND_EXACT[message];
  if (exact) return t(exact);

  for (const { pattern, key, param } of BACKEND_PATTERNS) {
    const match = message.match(pattern);
    if (match) return t(key, param ? { [param]: match[1] ?? "" } : undefined);
  }

  return message;
};

type I18nContextValue = {
  language: Language;
  preference: LanguagePreference;
  setPreference: (value: LanguagePreference) => void;
  t: Translate;
  /** Localizes an error or status message coming from the main process. */
  tm: (raw: unknown) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ComponentChildren }) {
  const [preference, setPreferenceState] =
    useState<LanguagePreference>(readPreference);

  const language = preference === "auto" ? detectLanguage() : preference;

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(language);
    return {
      language,
      preference,
      setPreference: (next) => {
        writePreference(next);
        setPreferenceState(next);
      },
      t,
      tm: createMessageLocalizer(t),
    };
  }, [language, preference]);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language];
    void window.sah?.setLanguage?.(language);
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>.");
  return context;
};
