import { createHash } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config";
import { tokenize } from "./highlight";
import { renderPng, type RenderInput } from "./render";

/** 画像のデザインを変えたら上げる(古いキャッシュを使わなくなる) */
const RENDER_VERSION = 1;

export const IMAGE_FILE = /^[0-9a-f]{40}\.png$/;

export interface ImageRequest {
  title: string;
  source: string;
  filename: string;
  start: number;
  end: number;
  /** キャッシュキーに入れる値(リポジトリ・ref・パス・内容の版) */
  key: string[];
}

export interface ImageResult {
  file: string;
  width: number;
  height: number;
}

const inflight = new Map<string, Promise<ImageResult>>();

export const imagePath = (file: string) => join(config.cacheDir, file);

/** キャッシュにあればそれを、なければ描画して保存する。同じ画像の同時要求は 1 回にまとめる */
export function getImage(req: ImageRequest): Promise<ImageResult> {
  const file = createHash("sha1").update(JSON.stringify([RENDER_VERSION, req.key, req.start, req.end])).digest("hex") + ".png";
  const running = inflight.get(file);
  if (running) return running;
  const task = produce(file, req).finally(() => inflight.delete(file));
  inflight.set(file, task);
  return task;
}

async function produce(file: string, req: ImageRequest): Promise<ImageResult> {
  const existing = Bun.file(imagePath(file));
  if (await existing.exists()) {
    // PNG の IHDR から幅と高さを読む(再起動後もキャッシュを使えるように)
    const head = Buffer.from(await existing.slice(0, 24).arrayBuffer());
    if (head.length === 24) return { file, width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  }

  const all = req.source.split("\n");
  if (all.at(-1) === "") all.pop();
  // 巨大なファイルは範囲だけ色付けする(先頭からの文脈は捨てる)
  const fromTop = req.end <= 3000;
  const code = (fromTop ? all.slice(0, req.end) : all.slice(req.start - 1, req.end)).join("\n");
  const tokens = await tokenize(code, req.filename);
  const lines = fromTop ? tokens.slice(req.start - 1, req.end) : tokens;

  const input: RenderInput = {
    title: req.title,
    rangeLabel: req.start === req.end ? `L${req.start}` : `L${req.start}–L${req.end}`,
    startLine: req.start,
    lines,
  };
  const { png, width, height } = await renderPng(input);
  await mkdir(config.cacheDir, { recursive: true });
  await writeFile(imagePath(file), png);
  return { file, width, height };
}

/** 期限切れと容量超過の画像を消す */
export async function cleanupImages(): Promise<void> {
  const names = await readdir(config.cacheDir).catch(() => [] as string[]);
  const entries = (
    await Promise.all(
      names
        .filter((n) => IMAGE_FILE.test(n))
        .map(async (n) => ({ n, s: await stat(imagePath(n)).catch(() => null) })),
    )
  )
    .filter((e): e is { n: string; s: NonNullable<typeof e.s> } => e.s !== null)
    .sort((a, b) => a.s.mtimeMs - b.s.mtimeMs);
  const limit = Date.now() - config.imageTtlDays * 86_400_000;
  let total = entries.reduce((sum, e) => sum + e.s.size, 0);
  for (const e of entries) {
    if (e.s.mtimeMs < limit || total > config.imageCacheMaxBytes) {
      total -= e.s.size;
      await unlink(imagePath(e.n)).catch(() => {});
    }
  }
}
