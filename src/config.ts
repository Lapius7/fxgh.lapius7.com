const env = process.env;

export const config = {
  port: Number(env.PORT ?? 8140),
  baseUrl: (env.BASE_URL ?? "http://localhost:8140").replace(/\/+$/, ""),
  githubToken: env.GITHUB_TOKEN || undefined,
  cacheDir: env.CACHE_DIR ?? "./cache",
  /** 1回の埋め込みで表示する最大行数 */
  maxLines: 70,
  /** 取得するファイルの最大サイズ(バイト) */
  maxFileBytes: 1_000_000,
  /** 画像キャッシュの保持日数 */
  imageTtlDays: 14,
  /** 画像キャッシュの合計上限(バイト) */
  imageCacheMaxBytes: 500 * 1024 * 1024,
};
