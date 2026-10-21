import { bundledLanguages } from "shiki";

const BY_EXT: Record<string, string> = {
  mjs: "javascript", cjs: "javascript", js: "javascript", jsx: "jsx", ts: "typescript", mts: "typescript",
  cts: "typescript", tsx: "tsx", py: "python", rb: "ruby", rs: "rust", kt: "kotlin", kts: "kotlin",
  h: "c", hpp: "cpp", cc: "cpp", cxx: "cpp", cs: "csharp", sh: "bash", zsh: "bash", yml: "yaml",
  md: "markdown", mdx: "mdx", htm: "html", ps1: "powershell", psm1: "powershell", tf: "terraform",
  gradle: "groovy", pl: "perl", ex: "elixir", exs: "elixir", hs: "haskell", jl: "julia", gd: "gdscript",
};

const BY_NAME: Record<string, string> = {
  dockerfile: "dockerfile", makefile: "make", "cmakelists.txt": "cmake", ".bashrc": "bash", ".zshrc": "bash",
};

/** ファイル名から shiki の言語を決める。分からなければ text */
export function detectLang(filename: string): string {
  const name = filename.toLowerCase();
  if (BY_NAME[name]) return BY_NAME[name];
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  const lang = BY_EXT[ext] ?? ext;
  return lang && lang in bundledLanguages ? lang : "text";
}
