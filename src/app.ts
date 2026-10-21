import { Hono } from "hono";
import { join, normalize } from "node:path";
import { config } from "./config";
import { embedHtml } from "./html";
import { IMAGE_FILE, getImage, imagePath } from "./images";
import { FetchError, fetchBlob, fetchReadme, getGist, getRepo, isGistId, isName, fetchRaw, type RepoInfo } from "./github";
import { firstReadmeImage } from "./readme-image";
import { findRangeParam, resolveRange } from "./range";

const BOT = /discord|twitterbot|slackbot|telegrambot|facebookexternalhit|facebot|whatsapp|linkedinbot|mastodon|bluesky|skypeuripreview|embedly|vkshare|iframely|redditbot|line-poker|googlebot/i;
const WEB_ROOT = new URL("../web/dist", import.meta.url).pathname;

export const app = new Hono();

const isBot = (ua: string | undefined) => BOT.test(ua ?? "");
const count = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n));
const metrics = (r: RepoInfo | null) =>
  r ? `⭐ ${count(r.stars)}   🍴 ${count(r.forks)}   🐛 ${count(r.issues)}   👀 ${count(r.watchers)}` : "";

const html = (body: string, status: 200 | 404 | 400 | 413 | 415 | 502 = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300", vary: "user-agent" } });

const errorEmbed = (message: string, url: string, status: number) =>
  html(embedHtml({ title: "FxGithub", description: message, url }), (status as 404) ?? 502);

/** 行指定を GitHub の `#L10-L20` 形式に戻す */
function fragment(param: string | undefined): string {
  const m = param && /^L?(\d+)(?:C\d+)?(?:-L?(\d+)(?:C\d+)?)?$/i.exec(param);
  if (!m) return "";
  return m[2] ? `#L${m[1]}-L${m[2]}` : `#L${m[1]}`;
}

// 静的ファイル(トップページ)。dist の外には出さない
app.get("/", (c) => serveWeb("index.html", c));
app.get("/assets/*", (c) => serveWeb(c.req.path.slice(1), c));
for (const f of ["favicon.svg", "favicon-dark.svg", "favicon.png"]) app.get(`/${f}`, (c) => serveWeb(f, c));
app.get("/favicon.ico", (c) => serveWeb("favicon.png", c));

app.get("/healthz", (c) => c.text("ok"));

app.get("/img/:file", async (c) => {
  const file = c.req.param("file");
  if (!IMAGE_FILE.test(file)) return c.notFound();
  const f = Bun.file(imagePath(file));
  if (!(await f.exists())) return c.notFound();
  return new Response(f, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400, immutable" } });
});

app.get("/oembed.json", (c) => {
  const q = c.req.query();
  return c.json({
    type: "link",
    version: "1.0",
    provider_name: "FxGithub",
    provider_url: config.baseUrl,
    title: q.title ?? "",
    author_name: q.author ?? "",
    author_url: /^https:\/\/(gist\.)?github\.com\//.test(q.url ?? "") ? q.url : undefined,
  });
});

app.get("/gist/:user/:id", async (c) => {
  const { user, id } = c.req.param();
  const url = new URL(c.req.url);
  const param = findRangeParam(url.searchParams);
  const target = `https://gist.github.com/${user}/${id}`;
  if (!isName(user) || !isGistId(id)) return c.notFound();
  if (!isBot(c.req.header("user-agent"))) return c.redirect(target + fragment(param), 302);

  try {
    const gist = await getGist(id);
    const wanted = url.searchParams.get("file");
    const file = gist.files.find((f) => f.filename === wanted) ?? gist.files[0]!;
    const raw = await fetchRaw(file.rawUrl);
    if (!raw) throw new FetchError("Gist のファイルを取得できません", 404);
    const total = raw.text.replace(/\n$/, "").split("\n").length;
    const range = resolveRange(param, total);
    const img = await getImage({
      title: `${gist.owner}/gist/${file.filename}`,
      source: raw.text,
      filename: file.filename,
      start: range.start,
      end: range.end,
      key: ["gist", id, file.filename, raw.version],
    });
    const extras = [gist.revisions > 1 && `${gist.revisions} 📝`, gist.forks && `${gist.forks} 🍴`, gist.files.length > 1 && `${gist.files.length} 📁`, gist.comments && `${gist.comments} 💬`];
    return html(
      embedHtml({
        title: `${file.filename} — ${gist.owner}'s gist`,
        description: gist.description ?? "",
        url: target + `#file-${encodeURIComponent(file.filename.toLowerCase().replace(/\./g, "-"))}`,
        imageUrl: `${config.baseUrl}/img/${img.file}`,
        imageWidth: img.width,
        imageHeight: img.height,
        metrics: extras.filter(Boolean).join("   "),
      }),
    );
  } catch (e) {
    const err = e instanceof FetchError ? e : new FetchError("エラーが発生しました");
    return errorEmbed(err.message, target, err.status);
  }
});

/** /owner/repo と /owner/repo/blob/<ref>/<path> */
async function repoRoute(c: import("hono").Context) {
  const { owner, repo } = c.req.param() as { owner: string; repo: string };
  if (!isName(owner) || !isName(repo)) return c.notFound();
  const url = new URL(c.req.url);
  const rest = url.pathname.split("/").slice(3).filter(Boolean).map(decodeURIComponent);
  const param = findRangeParam(url.searchParams);
  const githubUrl = `https://github.com/${owner}/${repo}${rest.length ? "/" + rest.map(encodeURIComponent).join("/") : ""}`;

  const isBlob = rest[0] === "blob" && rest.length >= 3;
  const isBare = rest.length === 0;
  if (!isBot(c.req.header("user-agent")) || (!isBlob && !isBare)) return c.redirect(githubUrl + fragment(param), 302);

  try {
    const repoInfo = await getRepo(owner, repo);
    const found = isBlob
      ? await fetchBlob(owner, repo, rest.slice(1))
      : await fetchReadme(owner, repo, repoInfo?.defaultBranch ?? "HEAD");
    if (!isBlob) {
      // リポジトリ単体: README 先頭の画像、なければ GitHub 標準の OGP 画像
      const readmeImg = firstReadmeImage(found.file.text, owner, repo, found.ref, found.path);
      return html(
        embedHtml({
          title: `${owner}/${repo}`,
          description: repoInfo?.description ?? "",
          url: githubUrl,
          imageUrl: readmeImg ?? `https://opengraph.githubassets.com/1/${owner}/${repo}`,
          metrics: metrics(repoInfo),
        }),
      );
    }
    const total = found.file.text.replace(/\n$/, "").split("\n").length;
    const range = resolveRange(param, total);
    const filename = found.path.split("/").pop()!;
    const img = await getImage({
      title: `${owner}/${repo}/${found.path}`,
      source: found.file.text,
      filename,
      start: range.start,
      end: range.end,
      key: ["repo", owner, repo, found.ref, found.path, found.file.version],
    });
    return html(
      embedHtml({
        title: `${found.path} — ${owner}/${repo}`,
        description: repoInfo?.description ?? "",
        url: githubUrl + fragment(param),
        imageUrl: `${config.baseUrl}/img/${img.file}`,
        imageWidth: img.width,
        imageHeight: img.height,
        metrics: metrics(repoInfo),
      }),
    );
  } catch (e) {
    const err = e instanceof FetchError ? e : new FetchError("エラーが発生しました");
    return errorEmbed(err.message, githubUrl, err.status);
  }
}
app.get("/:owner/:repo", repoRoute);
app.get("/:owner/:repo/*", repoRoute);


async function serveWeb(rel: string, c: import("hono").Context) {
  const full = normalize(join(WEB_ROOT, rel));
  if (!full.startsWith(WEB_ROOT + "/")) return c.notFound();
  const f = Bun.file(full);
  if (!(await f.exists())) return c.notFound();
  const immutable = rel.startsWith("assets/");
  return new Response(f, { headers: { "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=300" } });
}

app.notFound((c) => c.text("Not Found", 404));
