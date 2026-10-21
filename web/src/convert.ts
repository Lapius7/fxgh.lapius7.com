export const FX_HOST = "fxgh.lapius7.com";

export type Converted = { ok: true; url: string; kind: "file" | "repo" | "gist" } | { ok: false; reason: string };

/** GitHub の URL を FxGithub の URL に変える。`#L1-L20` は `?L1-L20` にする */
export function convert(input: string, host = FX_HOST): Converted {
  const text = input.trim();
  if (!text) return { ok: false, reason: "" };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: "URL として読み取れません" };
  }
  const h = u.hostname.toLowerCase().replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const range = /^#(L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?)$/i.exec(u.hash)?.[1];
  const q = range ? `?${range}` : "";

  if (h === "gist.github.com") {
    if (parts.length < 2) return { ok: false, reason: "Gist は 作者名/ID の形式で指定してください" };
    return { ok: true, kind: "gist", url: `https://${host}/gist/${parts[0]}/${parts[1]}${q}` };
  }
  if (h === "github.com" || h === host) {
    if (parts.length < 2) return { ok: false, reason: "オーナー名とリポジトリ名を含む URL を貼ってください" };
    const isFile = parts[2] === "blob" && parts.length >= 5;
    if (parts.length > 2 && !isFile) return { ok: false, reason: "対応しているのはファイル(blob)、リポジトリのトップ、Gist です" };
    return { ok: true, kind: isFile ? "file" : "repo", url: `https://${host}/${parts.join("/")}${q}` };
  }
  return { ok: false, reason: "github.com か gist.github.com の URL を貼ってください" };
}
