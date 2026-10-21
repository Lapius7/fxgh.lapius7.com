# FxGithub

GitHub のコード片・README・Gist を、Discord などで画像つきのプレビューとして展開するサービスです。
Bun + TypeScript で動くセルフホスト版です。公開先は https://fxgh.lapius7.com です。

## 使い方

URL の `github.com` を `fxgh.lapius7.com` に書き換えます。行範囲は、`#` を `?` に変えます。`#` 以降はブラウザからサーバーへ送られないためです。

| 対象 | 元の URL | FxGithub の URL |
|---|---|---|
| ファイル(行範囲つき) | `github.com/o/r/blob/main/a.ts#L10-L20` | `fxgh.lapius7.com/o/r/blob/main/a.ts?L10-L20` |
| 単一行 | `…/a.ts#L7` | `…/a.ts?L7` |
| README | `github.com/o/r` | `fxgh.lapius7.com/o/r` |
| Gist | `gist.github.com/user/id` | `fxgh.lapius7.com/gist/user/id` |

複数ファイルの Gist は、`?file=ファイル名` で表示するファイルを選べます。トップページに、URL の変換ツールがあります。

## 動作

- Discord・X・Slack などのクローラーには、OGP と oEmbed つきの HTML を返します。ブラウザには GitHub へのリダイレクトを返します。
- 表示は最大 70 行です。範囲を指定しないと先頭の 70 行を表示します。
- 公開リポジトリと公開 Gist だけに対応します。バイナリと 1 MB を超えるファイルは拒否します。
- コード画像は shiki で色付けし、satori と resvg で PNG にします。ヘッドレスブラウザは使いません。フォントは M PLUS 1 Code を同梱しているので、日本語のコメントも表示できます。
- 画像はキャッシュディレクトリに保存します。ファイルの内容が変わると別の画像になります。14 日を過ぎた画像と、合計 500 MB を超えた分は、古いものから削除します。

## 構成

```
src/        サーバー(Hono)。app.ts がルーティング、github.ts が取得、images.ts と render.ts が画像生成
web/        トップページ(Vite + React + Tailwind + shadcn/ui)。ビルド結果は web/dist
assets/     同梱フォント
test/       bun test
```

## 開発

```sh
pnpm install
pnpm run build   # トップページをビルド
pnpm run dev     # サーバーを起動(http://localhost:8140)
bun test
```

## 設定

`.env.example` を `.env` にコピーして設定します。

| 変数 | 内容 |
|---|---|
| `PORT` | 待ち受けポート(既定 8140。127.0.0.1 のみで待ち受けます) |
| `BASE_URL` | 公開 URL。`og:image` の絶対 URL に使います |
| `GITHUB_TOKEN` | 任意。未設定だと GitHub API は 1 時間に 60 回までです。公開リポジトリの読み取りだけを許可した fine-grained トークンを設定します |
| `CACHE_DIR` | 画像の保存先(既定 `./cache`) |

GitHub API はリポジトリの情報(スター数など)と Gist だけに使います。ファイルの本文は `raw.githubusercontent.com` から取得するため、API の上限に数えられません。API が上限に達しても、画像の表示は続けます。

## プライバシー

取得したコードから作った画像を、サーバーに最大 14 日間保存します。

## デプロイ

`sitedeploy fxgh.lapius7.com "<メッセージ>"` で、GitHub への push と VPS への反映を行います。VPS では `/root/project/web/fxgh.lapius7.com` に置き、pm2(`fxgh-lapius7`)で常駐させ、nginx が `127.0.0.1:8140` へ転送します。nginx の設定は `nginx.conf` です。

## ライセンス

フォントの M PLUS 1 Code は SIL Open Font License です(`assets/fonts/OFL-MPLUS1Code.txt`)。
