import { config } from "./config";

export interface LineRange {
  start: number;
  end: number;
  /** 行数の上限で切り詰めたか */
  truncated: boolean;
  /** URL で行が指定されたか */
  explicit: boolean;
}

const RANGE = /^L?(\d+)(?:C\d+)?(?:-L?(\d+)(?:C\d+)?)?$/i;

/** `?L10-L20` / `?L10` / `?L10C3-L12C8` のクエリ文字列から行指定を探す */
export function findRangeParam(search: URLSearchParams): string | undefined {
  for (const key of search.keys()) if (RANGE.test(key)) return key;
  const lines = search.get("lines");
  return lines && RANGE.test(lines) ? lines : undefined;
}

/** 行指定を、実際のファイルの行数に収めた範囲にする */
export function resolveRange(param: string | undefined, totalLines: number): LineRange {
  const max = config.maxLines;
  const m = param ? RANGE.exec(param) : null;
  let start = 1;
  let end = totalLines;
  let explicit = false;
  if (m) {
    explicit = true;
    start = Number(m[1]);
    end = m[2] ? Number(m[2]) : start;
    if (end < start) [start, end] = [end, start];
  }
  start = Math.min(Math.max(start, 1), Math.max(totalLines, 1));
  end = Math.min(Math.max(end, start), Math.max(totalLines, 1));
  let truncated = false;
  if (end - start + 1 > max) {
    end = start + max - 1;
    truncated = true;
  }
  return { start, end, truncated, explicit };
}
