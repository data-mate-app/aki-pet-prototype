# CONTRIBUTING — このリポジトリの扱い方

これから加わる開発者・デザイナー向けの手引き。クローンして動かし、ブランチを切り、PR を出して、公開されるまでの流れを書く。
アプリの中身は [README.md](README.md)、案件の目的は [docs/ai/project.md](docs/ai/project.md) を見る。

- ここに載せたコマンドは、2026-11-28 に手元で実行して通ることを確かめた。実行していないものは、そう書いた。
- 決まっていないことは規則を作らず「未設定」と書いた。決めたいときはリポジトリの管理者に相談する。
- 絵の素材がほしいだけなら、クローンしなくてよい。公開版の素材ギャラリー https://data-mate-app.github.io/aki-pet-prototype/gallery.html から SVG・PNG を保存できる（中身は [design/README.md](design/README.md)）。

## いまの設定の早見表（2026-11-28 時点）

| 項目 | 内容 |
|---|---|
| リポジトリ | https://github.com/data-mate-app/aki-pet-prototype （public） |
| 既定ブランチ | `main`。公開版のもと |
| ブランチ名 | `feature/`・`fix/`・`chore/` で始める。`codex/` は付けない |
| 変更の入れ方 | PR を通す。`main` への直接 push・force push はしない（PR #1 からの運用） |
| マージ方法 | squash（これまでの PR はすべて） |
| PR で走る CI | なし。手元で `pnpm verify` を通して結果を PR に書く |
| 公開 | `main` へのマージで自動（GitHub Actions → GitHub Pages） |
| レビューの担当・マージしてよい人 | 未設定 |
| ライセンス | 未設定 |

## 1. リポジトリの扱い方

- モックのプロトタイプ。サーバー・ログイン・外部連携はなく、保存は localStorage だけ。
- **public** のリポジトリ。push した内容は誰でも見られる。認証情報・個人情報を入れない。
- `main` に入った変更はそのまま公開版になる。公開版を壊しうる変更や、公開を止める変更は、先にリポジトリの管理者に相談する。
- `dist/` はビルドの出力で、Git に入れない。

主な置き場。

| 場所 | 内容 |
|---|---|
| `src/` | アプリ本体（詳細は [README.md](README.md) の「構成」） |
| `docs/` | 設計・フロー・音の文書 |
| `docs/ai/` | 案件の目的（`project.md`）・引き継ぎ（`handoff.md`）・作業票。主に AI の担当が作業の区切りで書いてきた |
| `design/` | Figma 用の書き出し。`pnpm design:export` が作る。**手で直さない**（[design/README.md](design/README.md)） |
| `scripts/` | 書き出し・撮影のスクリプト |
| `public/` | 静的ファイル |
| `assets-src/` | 音の編集元 |
| `.github/workflows/deploy.yml` | 公開の workflow |

作るときの約束は、人が作るときも同じ。内容はここへ写さず、次の場所を読む。

- 罰を与えない設計・記録がないものは「不明」・ルールは `src/domain/` の純粋関数にしてテストを付ける・`prefers-reduced-motion` への対応: [AGENTS.md](AGENTS.md) の「このリポジトリの約束」
- キャラデータの設計: [docs/character-model.md](docs/character-model.md)
- 重なり順（z-index）: [docs/ai/project.md](docs/ai/project.md) の「重なり順（z-index）」

push には書き込み権限が要る。権限はリポジトリの管理者に頼む。fork から PR を出す流れは未設定。
Issue は有効だが、使い方は未設定（2026-11-28 時点で Issue は 1 件もない）。

## 2. クローンの仕方

必要なもの。

- Git
- Node.js 22（22.13 以上。pnpm 11.6.0 がそれより前の版では動かない）
- pnpm 11.6.0
- Google Chrome（`pnpm design:export` と `scripts/side-room-shot.mjs` だけで要る。playwright-core が手元の Chrome を使う）
- GitHub CLI `gh`（任意。クローン・PR 作成・マージ・公開の確認に使える）

Node.js と pnpm の版は CI と同じ。`package.json` に版の指定（engines・packageManager）はなく、未設定。手元の確認は Node v22.22.3・pnpm 11.6.0。
Node.js と pnpm の入れ方は、それぞれの公式の手順を見る。

クローンは 3 通りある。どれでもよい。

HTTPS（public なのでクローンにログインは要らない）。

```bash
git clone https://github.com/data-mate-app/aki-pet-prototype.git
```

SSH。

```bash
git clone git@github.com:data-mate-app/aki-pet-prototype.git
```

GitHub CLI。

```bash
gh repo clone data-mate-app/aki-pet-prototype
```

push には GitHub の認証（SSH 鍵か `gh auth` など）が要る。

クローンしたら、ディレクトリに入って依存を入れる。`--frozen-lockfile` は lockfile のとおりに入れる指定で、CI と同じ。

```bash
cd aki-pet-prototype
```

```bash
pnpm install --frozen-lockfile
```

## 3. 手元での起動・確認

| コマンド | すること |
|---|---|
| `pnpm dev` | 開発サーバー。http://localhost:5320/ 。同じネットワークのスマホからは、起動時に `Network:` に出る URL で開ける |
| `pnpm typecheck` | 型チェック（`tsc -b`） |
| `pnpm test` | テスト（vitest。`src/**/*.test.ts`）。2026-11-28 時点で 12 ファイル 141 件 |
| `pnpm verify` | 型チェック → テスト → 本番ビルド。マージ前と CI で必ず通す |
| `pnpm build` | 本番ビルド（`dist/`） |
| `pnpm preview` | ビルドした `dist/` を開く。http://localhost:4173/ |
| `pnpm design:export` | 絵を Figma 用 SVG に書き出し、`design/` を作り直す（Chrome が要る）。絵（`src/art/` など）を直したら回す |

入口は 3 つ。

- アプリ本体 `/`
- 素材ギャラリー `/gallery.html`
- 横スクロールの別案 `/side-room.html`（本体からリンクはない。URL を直接開く）

見た目や動きを変えたら、ブラウザで実際に触って確かめる。

- スマホ幅 375×812 と PC 幅（これまで 1440×900 で確認してきた）の両方で触る。Chrome なら DevTools のデバイス表示で幅を変えられる。
- 動きを減らす設定（`prefers-reduced-motion: reduce`）でも見え方を確かめる。Chrome なら DevTools の Rendering で切り替えられる。
- コンソールにエラーが出ていないことを見る。

デモ操作について。

- PC では、画面の幅が 1100px より広いと、端末の枠の右にデモ操作が出る（1100px ちょうどでは出ない）。
- スマホ幅では、ステータスバーの時刻をタップするとデモ操作のシートが開く。
- 記録を消して最初からやり直すときは、デモ操作の「データを消して最初から」。

## 4. ブランチの切り方

- `main` から切る。
- 接頭辞は 3 つ。
  - `feature/`: 機能・画面・素材を足す（例 `feature/sound`、`feature/rug-slots`）
  - `fix/`: 不具合を直す（例 `fix/furniture-touch-drag`）
  - `chore/`: 文書・設定・運用（例 `chore/user-flow-doc`）
- 接頭辞のあとの名前は、これまで英小文字とハイフンで付けてきた。
- `codex/` は付けない（このリポジトリの決まり）。AI ツールが自動で作る名前（`claude/...` など）のブランチは、PR にしたことがなく、GitHub 上にもない（2026-11-28 時点）。
- これまでは 1 ブランチ = 1 つのまとまった変更 = 1 PR。

`main` を最新にして、ブランチを切る。

```bash
git switch main
```

```bash
git pull
```

```bash
git switch -c feature/xxx
```

変えたファイルをコミットする。

```bash
git add <変えたファイル>
```

```bash
git commit -m "<変えたことを「〜する」の形で>"
```

コミットメッセージは、これまで日本語で「〜する」「〜を直す」の形だった（例「ラグを 3 か所から選んで敷けるようにする」）。決まりとして文書化されたものはなく、これまでの書き方として示す。

## 5. PR の出し方

- `main` への直接 push と force push はしない。変更は PR を通して入れる（PR #1 からの運用）。
- リポジトリにはブランチ保護もルールセットもない（2026-11-28 確認）。Organization 側の制限は未確認。リポジトリの設定では止まらないので、人が守る。
- **PR には自動のチェック（CI）が走らない。** `deploy.yml` は `main` への push と手動実行だけで動く。これまでの PR は、本文に `pnpm verify` の結果とブラウザで確かめたことを書いてきた（#4 を除くすべてに確認の節がある）。
- PR のタイトルも、これまで日本語の「〜する」形。
- squash マージでは、PR のコミットが 1 つならそのコミットの題、2 つ以上なら PR のタイトルが `main` のコミットの題になり、末尾に ` (#番号)` が付く（リポジトリの設定 `COMMIT_OR_PR_TITLE`）。PR のタイトルとコミットの題が違うと、`main` に残るのはコミットの題のほうになることがある（[#4](https://github.com/data-mate-app/aki-pet-prototype/pull/4)・[#6](https://github.com/data-mate-app/aki-pet-prototype/pull/6) がその例）。
- 誰がレビューするかは未設定。リポジトリの設定に必須の承認はない（Organization 側は未確認）。

ブランチを push する。

```bash
git push -u origin <ブランチ名>
```

PR は GitHub の画面か、`gh` で作る。

```bash
gh pr create --base main --title "..." --body-file <本文のファイル>
```

PR テンプレートは未設定（ファイルなし）。本文の見出しも決まっていない。これまでの PR は見出しがまちまちだが、ほぼすべてに「変えたこと（変更）」と「確かめたこと（確認・検証）」の節があり、残る問題があればそれも書いてきた。たとえば [#13](https://github.com/data-mate-app/aki-pet-prototype/pull/13) は次の形。決まりではなく、コピーして使える例として置く。

```markdown
## 概要

## 変えたこと

## 確かめたこと

## 残課題
```

## 6. マージと公開の流れ

- マージ方法: これまでの PR はすべて squash マージ（`main` の PR のコミットはどれも親が 1 つで、題の末尾に ` (#番号)` が付いている。squash マージの形）。リポジトリの設定ではマージコミット・rebase も許可されているが、使っていない。
- 誰がマージしてよいかは未設定。
- マージ前に、`pnpm verify` が通ることと、ブラウザで確かめたことを確かめる。見た目や動きを変えたなら、スマホ幅と PC 幅の両方で触ったことも。

マージは GitHub の画面か、`gh` で行う。

```bash
gh pr merge <番号> --squash
```

マージすると、GitHub Actions「Deploy to GitHub Pages」（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が動く。

- 流れは `pnpm install --frozen-lockfile` → `pnpm verify` → `dist/` を Pages へ。これまで 1 回 40 秒前後。
- 続けてマージすると、古い実行は取り消され、最後のものが公開される（`concurrency: pages`、`cancel-in-progress: true`）。
- 公開の環境 `github-pages` は `main` からの deploy だけ許可（2026-11-28 確認）。

公開版は次の 3 つ。

- https://data-mate-app.github.io/aki-pet-prototype/
- https://data-mate-app.github.io/aki-pet-prototype/gallery.html
- https://data-mate-app.github.io/aki-pet-prototype/side-room.html

公開の確認は、GitHub の Actions タブか、次のコマンドで行う。実行の題は `main` のコミットの題と同じで、末尾に ` (#番号)` が付く。自分の PR の番号の行が `completed success` なら公開が済んでいる（マージ直後は、まだ前の PR の行がいちばん上に出ていることがある）。

```bash
gh run list --workflow deploy.yml --limit 3
```

実行中のものを終わるまで追うには、上の一覧に出る実行の ID を渡す。`--exit-status` を付けると、失敗したときに終了コードが 0 以外になる。

```bash
gh run watch <実行の ID> --exit-status
```

CI の `pnpm verify` が落ちると、deploy の段は動かず、公開版は前のまま残る（workflow で deploy が build に `needs` している）。直す PR を出す。

手動で公開し直すには、Actions の画面の「Run workflow」か、次のコマンドを使う。**手元では実行していない**（公開が走るため）。

```bash
gh workflow run deploy.yml --ref main
```

マージ後のブランチは自動では消えない（`delete_branch_on_merge` が無効）。消す決まりは未設定。手元のブランチを消すなら次の順で行う。

```bash
git switch main
```

```bash
git pull
```

```bash
git branch -d <ブランチ名>
```

公開版を壊したときの戻し方（revert の手順）は未設定。まずリポジトリの管理者に知らせる。

### GitHub 側の設定（2026-11-28 時点、`gh api` で確認）

| 項目 | 値 |
|---|---|
| 公開範囲 | public |
| 既定ブランチ | main |
| main のブランチ保護 | なし |
| ルールセット（リポジトリ） | なし |
| Organization のルールセット | 未確認（読む権限がなかった） |
| 許可されたマージ方法 | squash・マージコミット・rebase（これまでは squash だけ使用） |
| マージ後のブランチ自動削除 | 無効 |
| 自動マージ | 無効 |
| PR テンプレート | なし |
| PR で走る CI | なし |
| Pages | GitHub Actions から公開。github-pages 環境は main だけ |
