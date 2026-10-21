import { config } from "./config";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export interface EmbedMeta {
  title: string;
  description: string;
  /** 元の GitHub ページ */
  url: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  /** oEmbed の author_name に出す文字列(スター数など) */
  metrics?: string;
  siteName?: string;
}

export function embedHtml(m: EmbedMeta): string {
  const oembed = new URL("/oembed.json", config.baseUrl);
  oembed.searchParams.set("title", m.title);
  oembed.searchParams.set("author", m.metrics ?? "");
  oembed.searchParams.set("url", m.url);
  const tags = [
    `<meta property="og:site_name" content="${esc(m.siteName ?? "FxGithub")}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${esc(m.url)}">`,
    `<meta name="theme-color" content="#238636">`,
    `<meta name="twitter:card" content="${m.imageUrl ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
  ];
  if (m.imageUrl) {
    tags.push(
      `<meta property="og:image" content="${esc(m.imageUrl)}">`,
      `<meta property="og:image:type" content="image/png">`,
      `<meta property="og:image:width" content="${m.imageWidth ?? 1200}">`,
      `<meta property="og:image:height" content="${m.imageHeight ?? 630}">`,
      `<meta name="twitter:image" content="${esc(m.imageUrl)}">`,
    );
  }
  tags.push(`<link rel="alternate" type="application/json+oembed" href="${esc(oembed.toString())}" title="FxGithub">`);
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(m.title)}</title>${tags.join("")}</head><body><a href="${esc(m.url)}">${esc(m.title)}</a></body></html>`;
}
