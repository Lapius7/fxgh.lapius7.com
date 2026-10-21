import { useState } from "react";
import { Input } from "@/components/arc/input/input";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { Moon, Sun } from "lucide-react";
import { useThemeTransition } from "@/components/transitions/theme-transition";
import { convert } from "./convert";
import styles from "./App.module.css";

const EXAMPLE = "https://github.com/honojs/hono/blob/main/src/hono.ts#L16-L40";
const REPO = "https://github.com/Lapius7/fxgh.lapius7.com";

const FX = "fxgh.lapius7.com";
const TABS = [
  { id: "repo", label: "リポジトリ", from: "github.com/honojs/hono", to: `${FX}/honojs/hono`, note: "README の先頭にある画像を、そのままプレビューに使います。" },
  { id: "file", label: "ファイル", from: "github.com/honojs/hono/blob/main/src/hono.ts", to: `${FX}/honojs/hono/blob/main/src/hono.ts`, note: "行を指定しなければ、ファイルの先頭 70 行を表示します。" },
  { id: "range", label: "行範囲", from: "github.com/honojs/hono/blob/main/src/hono.ts#L16-L40", to: `${FX}/honojs/hono/blob/main/src/hono.ts?L16-L40`, note: "# を ? に置き換えると、指定した行のコードが色付きの画像になります。" },
  { id: "gist", label: "Gist", from: "gist.github.com/user/0123abcd", to: `${FX}/gist/user/0123abcd`, note: "公開 Gist のコードも同じように画像にします。" },
] as const;

const FEATURES = [
  ["行を指定して共有", "GitHub で行番号を選んだ URL のまま使えます。最大 70 行を 1 枚の画像にします。"],
  ["コードの色をそのまま", "シンタックスハイライトつきで、日本語を含むコードも崩れません。"],
  ["README の画像を使う", "リポジトリだけの URL は、README 先頭の画像と説明文で展開します。"],
  ["ブラウザでは GitHub へ", "人が開いたときは、行位置を保ったまま github.com へ移動します。"],
  ["公開リポジトリと Gist", "非公開のコードは取得しません。画像は最大 14 日間だけ保存します。"],
  ["ログインも設定も不要", "github.com の部分を書き換えるだけで使えます。"],
];

export function App() {
  const [value, setValue] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("repo");
  const result = convert(value, location.host);
  const invalid = value.trim() !== "" && !result.ok;
  const { toggleTheme, resolvedTheme } = useThemeTransition();
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <span className={styles.brand}>FxGithub</span>
        <span className={styles.actions}>
          <button
            type="button"
            className={styles.icon}
            aria-label={resolvedTheme === "dark" ? "ライトテーマにする" : "ダークテーマにする"}
            onClick={(e) => toggleTheme({ origin: e })}
          >
            {resolvedTheme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
          <a href={REPO}>github.com</a>
        </span>
      </header>

      <main style={{ display: "grid", gap: 56 }}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Share code in Discord.</h1>
          <p className={styles.lead}>
            GitHub のコード、README、Gist の URL を、画像つきで展開される URL に変換します。
            <br />
            ログインも拡張機能もいりません。
          </p>
        </section>

        <section className={styles.tool} aria-label="URL の変換">
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
              <span className={styles.prompt}>$</span>
              <output className={styles.url}>{result.url}</output>
              <CopyButton value={result.url} iconOnly label="コピー" variant="plain" />
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

        <section className={styles.demo} aria-label="使い方">
          <div className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={styles.tab}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className={styles.window}>
            <div className={styles.bar}>
              <span className={styles.dots} aria-hidden><i /><i /><i /></span>
              <span>URL</span>
              <span />
            </div>
            <div className={styles.body} role="tabpanel">
              <div className={styles.row}><span>$</span><span>{current.from}</span></div>
              <div className={`${styles.row} ${styles.out}`}><span>→</span><span>{current.to}</span></div>
            </div>
          </div>
          <p className={styles.caption}>{current.note}</p>
        </section>

        <section className={styles.grid} aria-label="特徴">
          {FEATURES.map(([title, body]) => (
            <div key={title} className={styles.cell}>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        FxGithub · <a href={REPO}>Lapius7/fxgh.lapius7.com</a>
      </footer>
    </div>
  );
}
