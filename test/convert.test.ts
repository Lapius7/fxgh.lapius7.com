import { expect, test } from "bun:test";
import { convert } from "../web/src/convert";

test("ファイル+行範囲", () => {
  expect(convert("https://github.com/o/r/blob/main/src/a.ts#L10-L20")).toEqual({ ok: true, kind: "file", url: "https://fxgh.lapius7.com/o/r/blob/main/src/a.ts?L10-L20" });
});
test("リポジトリ・Gist", () => {
  expect(convert("github.com/o/r")).toMatchObject({ ok: true, kind: "repo" });
  expect(convert("https://gist.github.com/u/abc123#file-a-rb")).toMatchObject({ ok: true, kind: "gist", url: "https://fxgh.lapius7.com/gist/u/abc123" });
});
test("非対応", () => {
  expect(convert("https://example.com/a/b").ok).toBe(false);
  expect(convert("https://github.com/o/r/issues/1").ok).toBe(false);
  expect(convert("").ok).toBe(false);
});
