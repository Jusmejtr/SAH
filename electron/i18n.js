// Strings for native dialogs opened by the main process. Everything else is
// translated in the renderer (src/i18n). The renderer reports the active
// language through the "app:set-language" IPC call.
const STRINGS = {
  en: { saveMaFile: "Save maFile", exportAccounts: "Export accounts", textFiles: "Text files" },
  es: { saveMaFile: "Guardar maFile", exportAccounts: "Exportar cuentas", textFiles: "Archivos de texto" },
  de: { saveMaFile: "maFile speichern", exportAccounts: "Konten exportieren", textFiles: "Textdateien" },
  fr: { saveMaFile: "Enregistrer le maFile", exportAccounts: "Exporter les comptes", textFiles: "Fichiers texte" },
  pt: { saveMaFile: "Salvar maFile", exportAccounts: "Exportar contas", textFiles: "Arquivos de texto" },
  pl: { saveMaFile: "Zapisz maFile", exportAccounts: "Eksportuj konta", textFiles: "Pliki tekstowe" },
  hu: { saveMaFile: "maFile mentése", exportAccounts: "Fiókok exportálása", textFiles: "Szövegfájlok" },
  ru: { saveMaFile: "Сохранить maFile", exportAccounts: "Экспорт аккаунтов", textFiles: "Текстовые файлы" },
  ja: { saveMaFile: "maFile を保存", exportAccounts: "アカウントをエクスポート", textFiles: "テキストファイル" },
  zh: { saveMaFile: "保存 maFile", exportAccounts: "导出账户", textFiles: "文本文件" },
};

let language = "en";

export const setLanguage = (value) => {
  if (typeof value === "string" && STRINGS[value]) language = value;
  return true;
};

export const tr = (key) => STRINGS[language]?.[key] ?? STRINGS.en[key] ?? key;
