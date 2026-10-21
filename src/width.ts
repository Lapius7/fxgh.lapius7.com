/** 全角(2桁)として描く文字か */
export function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += isWide(ch.codePointAt(0)!) ? 2 : 1;
  return w;
}

/** 表示幅が cols を超える部分を「…」で切る */
export function clipToWidth(s: string, cols: number): string {
  if (displayWidth(s) <= cols) return s;
  let w = 0;
  let out = "";
  for (const ch of s) {
    const cw = isWide(ch.codePointAt(0)!) ? 2 : 1;
    if (w + cw > cols - 1) break;
    out += ch;
    w += cw;
  }
  return out + "…";
}
