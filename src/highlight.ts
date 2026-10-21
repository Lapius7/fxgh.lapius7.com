import { createHighlighter, type HighlighterGeneric, type ThemedToken } from "shiki";
import { detectLang } from "./lang";

const THEME = "github-dark";

let highlighter: Promise<HighlighterGeneric<any, any>> | undefined;
const getHighlighter = () => (highlighter ??= createHighlighter({ themes: [THEME], langs: [] }));

export interface Token {
  text: string;
  color: string;
}

export const THEME_BG = "#0d1117";
export const THEME_FG = "#e6edf3";

/** code の 1 行ごとのトークン列を返す。言語が読み込めなければ無着色で返す */
export async function tokenize(code: string, filename: string): Promise<Token[][]> {
  const lang = detectLang(filename);
  const plain = () => code.split("\n").map((line) => [{ text: line, color: THEME_FG }]);
  if (lang === "text") return plain();
  try {
    const hl = await getHighlighter();
    if (!hl.getLoadedLanguages().includes(lang)) await hl.loadLanguage(lang as never);
    const lines: ThemedToken[][] = hl.codeToTokensBase(code, { lang: lang as never, theme: THEME });
    return lines.map((line) => line.map((t) => ({ text: t.content, color: t.color ?? THEME_FG })));
  } catch {
    return plain();
  }
}
