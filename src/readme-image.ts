/** README の先頭にある画像の URL を返す。バッジ・SVG・動画以外で最初のもの。 */
const BADGE_HOSTS = /(^|\.)(shields\.io|badgen\.net|badge\.fury\.io|travis-ci\.(org|com)|codecov\.io|coveralls\.io|bestpractices\.dev|api\.codacy\.com|img\.shields\.io|visitor-badge\.laobi\.icu|hits\.seeyoufarm\.com|komarev\.com)$/i;

export function firstReadmeImage(text: string, owner: string, repo: string, ref: string, path: string): string | null {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
  const candidates: { index: number; src: string }[] = [];
  for (const m of text.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) candidates.push({ index: m.index!, src: m[1]! });
  for (const m of text.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) candidates.push({ index: m.index!, src: m[1]! });
  candidates.sort((a, b) => a.index - b.index);

  for (const { src } of candidates) {
    const url = resolve(src.trim(), owner, repo, ref, dir);
    if (!url) continue;
    const u = new URL(url);
    if (BADGE_HOSTS.test(u.hostname)) continue;
    if (/\.(svg|mp4|webm|mov)$/i.test(u.pathname)) continue;
    if (/\/badges?\//i.test(u.pathname) || /badge\.svg/i.test(u.pathname)) continue;
    return url;
  }
  return null;
}

function resolve(src: string, owner: string, repo: string, ref: string, dir: string): string | null {
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/`;
  try {
    if (src.startsWith("//")) return new URL("https:" + src).toString();
    if (/^https?:\/\//i.test(src)) {
      const u = new URL(src);
      if (u.protocol !== "https:") return null;
      // github.com/.../blob/... は raw=true で実体に飛ぶ
      if (u.hostname === "github.com" && /\/blob\//.test(u.pathname)) u.searchParams.set("raw", "true");
      return u.toString();
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return null; // data: など
    const rel = src.startsWith("/") ? src.slice(1) : dir + src;
    return new URL(rel.replace(/^\.\//, ""), raw).toString();
  } catch {
    return null;
  }
}
