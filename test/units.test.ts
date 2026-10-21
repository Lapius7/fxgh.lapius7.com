import { describe, expect, test } from "bun:test";
import { findRangeParam, resolveRange } from "../src/range";
import { clipToWidth, displayWidth } from "../src/width";
import { isGistId, isName } from "../src/github";
import { detectLang } from "../src/lang";

describe("range", () => {
  test("範囲・単一行・列指定を読む", () => {
    expect(resolveRange("L10-L20", 100)).toMatchObject({ start: 10, end: 20, explicit: true });
    expect(resolveRange("L7", 100)).toMatchObject({ start: 7, end: 7 });
    expect(resolveRange("L3C2-L5C9", 100)).toMatchObject({ start: 3, end: 5 });
  });
  test("逆順・範囲外・上限70行", () => {
    expect(resolveRange("L20-L10", 100)).toMatchObject({ start: 10, end: 20 });
    expect(resolveRange("L90-L200", 100)).toMatchObject({ start: 90, end: 100 });
    expect(resolveRange("L1-L500", 1000)).toMatchObject({ start: 1, end: 70, truncated: true });
  });
  test("指定なしは先頭から", () => {
    expect(resolveRange(undefined, 30)).toMatchObject({ start: 1, end: 30, explicit: false });
    expect(resolveRange(undefined, 0)).toMatchObject({ start: 1, end: 1 });
  });
  test("クエリから探す", () => {
    expect(findRangeParam(new URLSearchParams("L1-L5"))).toBe("L1-L5");
    expect(findRangeParam(new URLSearchParams("file=a&lines=3-4"))).toBe("3-4");
    expect(findRangeParam(new URLSearchParams("foo=bar"))).toBeUndefined();
  });
});

describe("width", () => {
  test("全角は2桁", () => {
    expect(displayWidth("aあ")).toBe(3);
    expect(clipToWidth("あいうえお", 5)).toBe("あい…");
    expect(clipToWidth("abc", 5)).toBe("abc");
  });
});

describe("validation", () => {
  test("名前と Gist ID", () => {
    expect(isName("honojs")).toBe(true);
    expect(isName("..")).toBe(false);
    expect(isName("a/b")).toBe(false);
    expect(isGistId("6cad326836d38bd3a7ae")).toBe(true);
    expect(isGistId("../etc")).toBe(false);
  });
  test("言語判定", () => {
    expect(detectLang("a.ts")).toBe("typescript");
    expect(detectLang("Dockerfile")).toBe("dockerfile");
    expect(detectLang("README")).toBe("text");
  });
});
