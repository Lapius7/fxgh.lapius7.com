import { readFileSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { THEME_BG, THEME_FG, type Token } from "./highlight";
import { clipToWidth, displayWidth } from "./width";

const font = readFileSync(new URL("../assets/fonts/MPLUS1Code.ttf", import.meta.url));

const WIDTH = 1200;
const FONT_SIZE = 22;
const LINE_H = 34;
const CELL = FONT_SIZE / 2; // 半角1桁の幅
const PAD = 36;
const GUTTER = 72;
const HEADER_H = 64;
const COLS = Math.floor((WIDTH - PAD * 2 - GUTTER) / CELL);

export interface RenderInput {
  /** ヘッダーに出すファイルパス */
  title: string;
  /** 例: "L10–L20" */
  rangeLabel: string;
  startLine: number;
  /** 範囲内の行ごとのトークン */
  lines: Token[][];
}

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

/** 行のトークンを表示幅 COLS に収める */
function clipTokens(tokens: Token[]): Token[] {
  const out: Token[] = [];
  let used = 0;
  for (const t of tokens) {
    const text = t.text.replace(/\t/g, "    ");
    const w = displayWidth(text);
    if (used + w <= COLS) {
      out.push({ ...t, text });
      used += w;
      continue;
    }
    out.push({ ...t, text: clipToWidth(text, COLS - used) });
    break;
  }
  return out;
}

export interface Rendered {
  png: Buffer;
  width: number;
  height: number;
}

export async function renderPng(input: RenderInput): Promise<Rendered> {
  const rows = input.lines.map((tokens, i) => {
    const clipped = clipTokens(tokens);
    return el("div", { display: "flex", height: LINE_H, alignItems: "center" }, [
      el("div", { display: "flex", flexShrink: 0, width: GUTTER, justifyContent: "flex-end", paddingRight: 24, color: "#6e7681" }, String(input.startLine + i)),
      el(
        "div",
        { display: "flex", whiteSpace: "pre" },
        clipped.length
          ? clipped.map((t) => el("span", { color: t.color, whiteSpace: "pre" }, t.text))
          : el("span", { whiteSpace: "pre" }, " "),
      ),
    ]);
  });

  const height = HEADER_H + PAD / 2 + input.lines.length * LINE_H + PAD;
  const tree = el(
    "div",
    { display: "flex", flexDirection: "column", width: WIDTH, height, background: THEME_BG, color: THEME_FG, fontFamily: "Code", fontSize: FONT_SIZE },
    [
      el("div", { display: "flex", alignItems: "center", height: HEADER_H, padding: `0 ${PAD}px`, background: "#161b22", borderBottom: "1px solid #30363d" }, [
        el("div", { display: "flex", gap: 10, marginRight: 24 }, ["#ff5f57", "#febc2e", "#28c840"].map((c) => el("div", { width: 14, height: 14, borderRadius: 7, background: c }))),
        el("div", { display: "flex", flexGrow: 1, color: "#e6edf3" }, clipToWidth(input.title, 70)),
        el("div", { display: "flex", color: "#8b949e" }, input.rangeLabel),
      ]),
      el("div", { display: "flex", flexDirection: "column", padding: `${PAD / 2}px ${PAD}px 0 ${PAD}px`}, rows),
    ],
  );

  const svg = await satori(tree as never, {
    width: WIDTH,
    height,
    fonts: [{ name: "Code", data: font, weight: 400, style: "normal" }],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng() as Buffer;
  return { png, width: WIDTH, height };
}
