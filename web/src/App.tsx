import { useState } from "react";
import { Input } from "@/components/arc/input/input";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { CodeBlock } from "@/components/arc/code-block/code-block";
import { convert } from "./convert";
import styles from "./App.module.css";

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
  const result = convert(value, location.host);
  const invalid = value.trim() !== "" && !result.ok;

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden>{"</>"}</span>
          FxGithub
        </div>
      </header>

      <main style={{ display: "grid", gap: "var(--space-12)" }}>
        <section className={styles.hero}>
          <h1 className={styles.title}>GitHub のコードを、Discord できれいに見せる</h1>
          <p className={styles.lead}>
            ファイル、行範囲、README、Gist の URL を、画像つきのプレビューで展開される URL に変換します。
          </p>
        </section>

        <section className={styles.tool} aria-labelledby="convert-title">
          <h2 id="convert-title" hidden>URL を変換する</h2>
          <Input
            label="GitHub の URL"
            placeholder={EXAMPLE}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={invalid && !result.ok ? result.reason : undefined}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
          {result.ok ? (
            <div className={styles.result} aria-live="polite">
              <div className={styles.resultRow}>
                <output className={styles.url}>{result.url}</output>
                <CopyButton value={result.url} label="コピー" />
              </div>
            </div>
          ) : (
            !invalid && (
              <p className={styles.hint}>
                <button type="button" className={styles.link} onClick={() => setValue(EXAMPLE)}>
                  例を入れてみる
                </button>
              </p>
            )
          )}
        </section>

        <section className={styles.section} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.h2}>使い方</h2>
          <ol className={styles.steps}>
            {STEPS.map(([title, body], i) => (
              <li key={title} className={styles.step}>
                <span className={styles.num}>{i + 1}</span>
                <div>
                  <h3 className={styles.stepTitle}>{title}</h3>
                  <p className={styles.stepBody}>{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <CodeBlock
            filename="変換の例"
            language="text"
            code={`before  https://github.com/honojs/hono/blob/main/src/hono.ts#L16-L40\nafter   https://${location.host}/honojs/hono/blob/main/src/hono.ts?L16-L40`}
          />
        </section>

        <section className={styles.section} aria-labelledby="notes-title">
          <h2 id="notes-title" className={styles.h2}>仕様と注意</h2>
          <ul className={styles.notes}>
            {NOTES.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>FxGithub</footer>
    </div>
  );
}
