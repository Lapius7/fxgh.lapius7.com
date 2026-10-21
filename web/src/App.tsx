import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { convert } from "./convert";

const EXAMPLE = "https://github.com/honojs/hono/blob/main/src/hono.ts#L16-L40";

const STEPS = [
  ["URL を用意する", "GitHub でファイルを開き、共有したい最初の行番号をクリック、最後の行番号を Shift+クリックします。URL の末尾が #L16-L40 のようになります。"],
  ["ここで変換する", "URL を貼ると、# を ? に置き換えた FxGithub の URL ができます。github.com の部分を fxgh.lapius7.com に書き換えるだけでも同じです。"],
  ["Discord に貼る", "変換した URL を送ると、色付きのコード画像と、リポジトリの情報つきで展開されます。"],
] as const;

const NOTES = [
  "公開リポジトリと公開 Gist だけに対応しています。",
  "表示できるのは 1 回あたり最大 70 行です。超えた分は切り詰めます。",
  "範囲を指定しないと、ファイルの先頭から 70 行を表示します。リポジトリの URL だけを送ると README を表示します。",
  "取得したコードから生成した画像は、サーバーに最大 14 日間保存します。載せたくないコードは貼らないでください。",
];

export function App() {
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);
  const result = convert(value);

  const copy = async () => {
    if (!result.ok) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between">
        <span className="font-mono text-base font-semibold tracking-tight">FxGithub</span>
      </header>

      <main className="flex-1">
        <h1 className="mt-14 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          GitHub のコードを、Discord できれいに見せる
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted-foreground">
          ファイル・行範囲・README・Gist の URL を、画像つきのプレビューで展開される URL に変換します。
        </p>

        <section className="mt-8" aria-labelledby="convert-title">
          <h2 id="convert-title" className="sr-only">
            URL を変換する
          </h2>
          <label htmlFor="url" className="mb-2 block text-sm font-medium">
            GitHub の URL
          </label>
          <Input
            id="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={EXAMPLE}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="h-11 font-mono text-sm"
            aria-invalid={!result.ok && value.trim() !== ""}
            aria-describedby="url-state"
          />
          <div id="url-state" aria-live="polite" className="mt-3 min-h-[3.25rem]">
            {result.ok ? (
              <div className="flex items-stretch gap-2">
                <output className="flex min-w-0 flex-1 items-center rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm break-all">
                  {result.url}
                </output>
                <Button type="button" onClick={copy} className="h-auto shrink-0 whitespace-nowrap">
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? "コピーしました" : "コピー"}
                </Button>
              </div>
            ) : value.trim() ? (
              <p className="text-sm text-destructive">{result.reason}</p>
            ) : (
              <button
                type="button"
                onClick={() => setValue(EXAMPLE)}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                例を入れてみる
              </button>
            )}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="how-title">
          <h2 id="how-title" className="text-xl font-semibold tracking-tight">
            使い方
          </h2>
          <ol className="mt-4 space-y-5">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
                <span className="mt-0.5 flex size-7 items-center justify-center rounded-full border border-border font-mono text-xs tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14" aria-labelledby="notes-title">
          <h2 id="notes-title" className="text-xl font-semibold tracking-tight">
            仕様と注意
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-border">
            {NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mt-16 border-t border-border pt-6 font-mono text-sm text-muted-foreground">FxGithub</footer>
    </div>
  );
}
