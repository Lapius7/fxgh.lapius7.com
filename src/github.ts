import { TtlCache } from "./cache";
import { config } from "./config";

/** GitHub のユーザー名・リポジトリ名として許す文字 */
const NAME = /^[A-Za-z0-9._-]{1,100}$/;
const GIST_ID = /^[0-9a-f]{20,40}$/i;

export const isName = (s: string) => NAME.test(s) && s !== "." && s !== "..";
export const isGistId = (s: string) => GIST_ID.test(s);

export class FetchError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export interface RepoInfo {
  fullName: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  language: string | null;
}

export interface GistInfo {
  id: string;
  owner: string;
  description: string | null;
  files: { filename: string; rawUrl: string; size: number }[];
  forks: number;
  comments: number;
  revisions: number;
}

export interface RawFile {
  text: string;
  /** 内容が変わったら変わる値(キャッシュキー用) */
  version: string;
}

const API_HEADERS: Record<string, string> = {
  accept: "application/vnd.github+json",
  "user-agent": "FxGithub (+https://fxgh.lapius7.com)",
  "x-github-api-version": "2022-11-28",
  ...(config.githubToken ? { authorization: `Bearer ${config.githubToken}` } : {}),
};

const repoCache = new TtlCache<RepoInfo | null>(10 * 60_000);
const gistCache = new TtlCache<GistInfo>(10 * 60_000);
const rawCache = new TtlCache<RawFile>(60_000, 200);
const rawMiss = new TtlCache<true>(30_000, 500);

/** リポジトリ情報。取れなかった場合は null(レート制限などでも埋め込み自体は続ける) */
export async function getRepo(owner: string, repo: string): Promise<RepoInfo | null> {
  const key = `${owner}/${repo}`.toLowerCase();
  const cached = repoCache.get(key);
  if (cached !== undefined) return cached;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: API_HEADERS }).catch(() => null);
  if (!res || !res.ok) return repoCache.set(key, null, res?.status === 404 ? 60_000 : 30_000);
  const j = (await res.json()) as Record<string, any>;
  return repoCache.set(key, {
    fullName: j.full_name,
    description: j.description,
    defaultBranch: j.default_branch,
    stars: j.stargazers_count,
    forks: j.forks_count,
    issues: j.open_issues_count,
    watchers: j.subscribers_count ?? j.watchers_count,
    language: j.language,
  });
}

export async function getGist(id: string): Promise<GistInfo> {
  const cached = gistCache.get(id);
  if (cached) return cached;
  const res = await fetch(`https://api.github.com/gists/${id}`, { headers: API_HEADERS }).catch(() => null);
  if (!res) throw new FetchError("GitHub API に接続できません");
  if (res.status === 404) throw new FetchError("Gist が見つかりません", 404);
  if (!res.ok) throw new FetchError(res.status === 403 ? "GitHub API の上限に達しました。しばらくしてからお試しください" : "Gist を取得できません");
  const j = (await res.json()) as Record<string, any>;
  const files = Object.values<any>(j.files ?? {}).map((f) => ({ filename: f.filename, rawUrl: f.raw_url, size: f.size }));
  if (!files.length) throw new FetchError("Gist にファイルがありません", 404);
  return gistCache.set(id, {
    id,
    owner: j.owner?.login ?? "anonymous",
    description: j.description,
    files,
    forks: j.forks?.length ?? 0,
    comments: j.comments ?? 0,
    revisions: j.history?.length ?? 0,
  });
}

/** 取得を許す URL かどうか(SSRF 対策: GitHub のホストだけ) */
function assertAllowed(url: string): void {
  const u = new URL(url);
  if (u.protocol !== "https:" || !["raw.githubusercontent.com", "gist.githubusercontent.com"].includes(u.hostname)) {
    throw new FetchError("許可されていない取得先です", 400);
  }
}

/** 本文を取得する。サイズ上限を超えたら打ち切り、バイナリは拒否する */
export async function fetchRaw(url: string): Promise<RawFile | null> {
  assertAllowed(url);
  const cached = rawCache.get(url);
  if (cached) return cached;
  if (rawMiss.get(url)) return null;
  const res = await fetch(url, { headers: { "user-agent": API_HEADERS["user-agent"]! } }).catch(() => null);
  if (!res) throw new FetchError("GitHub に接続できません");
  if (res.status === 404) {
    rawMiss.set(url, true);
    return null;
  }
  if (!res.ok) throw new FetchError("ファイルを取得できません");
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > config.maxFileBytes) throw new FetchError("ファイルが大きすぎます(1MBまで)", 413);

  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.byteLength;
    if (total > config.maxFileBytes) throw new FetchError("ファイルが大きすぎます(1MBまで)", 413);
    chunks.push(chunk);
  }
  const buf = Buffer.concat(chunks);
  if (buf.subarray(0, 8000).includes(0)) throw new FetchError("バイナリファイルは表示できません", 415);
  const text = buf.toString("utf8").replace(/\r\n?/g, "\n");
  const version = res.headers.get("etag") ?? `${buf.byteLength}`;
  return rawCache.set(url, { text, version });
}

const enc = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/**
 * /owner/repo/blob/<ref>/<path> を解決する。ブランチ名に `/` が含まれることがあるので、
 * 区切り位置を順に試す(raw.githubusercontent.com は API の上限に数えられない)。
 */
export async function fetchBlob(owner: string, repo: string, rest: string[]) {
  const maxRefParts = Math.min(rest.length - 1, 4);
  for (let n = 1; n <= maxRefParts; n++) {
    const ref = rest.slice(0, n).join("/");
    const path = rest.slice(n).join("/");
    const file = await fetchRaw(`https://raw.githubusercontent.com/${owner}/${repo}/${enc(ref)}/${enc(path)}`);
    if (file) return { ref, path, file };
  }
  throw new FetchError("ファイルが見つかりません(非公開リポジトリには対応していません)", 404);
}

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.markdown", "README.rst", "README.txt", "README"];

export async function fetchReadme(owner: string, repo: string, branch: string) {
  for (const name of README_NAMES) {
    const file = await fetchRaw(`https://raw.githubusercontent.com/${owner}/${repo}/${enc(branch)}/${name}`);
    if (file) return { ref: branch, path: name, file };
  }
  throw new FetchError("README が見つかりません(非公開リポジトリには対応していません)", 404);
}
