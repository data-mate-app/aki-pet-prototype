# DataMate プロトタイプ（秋プロジェクト）

生活の記録で、ペットと部屋が育つアプリのモック。
睡眠・食事・集中・タスクを記録すると、ペットの調子と部屋が変わる。記録がない日は「不明」のまま扱い、責めない。

このプロトタイプで確かめたいのは **UI コンポーネントと演出の手ざわり**。サーバーはなく、データは端末のブラウザ（localStorage）にだけ保存する。

## 動かす

```bash
pnpm install
pnpm dev        # http://localhost:5320
pnpm verify     # 型チェック → テスト → 本番ビルド
```

- PC では端末の枠の右に「さわってみる」とデモ操作が出る（幅 1100px 以上）。
- スマホ幅ではステータスバーの時刻をタップするとデモ操作のシートが開く。
- デモ操作で時刻を早送りできる（朝・昼・夕方・夜・深夜）。部屋の光は時刻に合わせて連続して変わる。

## さわれるところ

| 画面 | 操作 |
|---|---|
| へや | 床をタップ → ペットが歩く／ペットをタップ・なでる／家具をタップ → その家具でできること（ねる・すわる・ごはん・集中・きろく）／家具を長押し → そのまま運ぶ・下の箱へ入れてしまう |
| へや（ねる） | ベッドで寝かせる → 起こすスライダー → 時計の針が起きた時刻まで回る → 睡眠を記録 |
| 集中 | 目盛りを横に送って分数を決める → タイマー中はペットが隣で勉強する（デモ用の早送りあり） |
| きろく | きょう／1週間。記録は左へスワイプで消せる。記録のない日は「不明」 |
| おみせ | カードを開く → 長押しで買う → 「部屋に置く」で部屋へ運ばれ、空いている場所へ置かれる |

## 構成

```
src/
  domain/     生活・ペット・部屋のルール（純粋関数。テストあり）
  data/       種族・家具・置き場所の定義
  art/        部屋・家具・ペットの SVG（等角投影）
  ui/         共通部品（BottomSheet, TabBar, Island, Pressable, 目盛り, 触覚・効果音）
  screens/    画面（home / Focus / Records / Shop / Onboarding / LevelUp / DemoPanel）
  store.ts    zustand（persist）
```

- キャラデータの設計: [docs/character-model.md](docs/character-model.md)
- 案件の目的・範囲: [docs/ai/project.md](docs/ai/project.md)
- 引き継ぎ: [docs/ai/handoff.md](docs/ai/handoff.md)

## 技術

React 19 / TypeScript 5.9（strict）/ Vite 8 / motion 14（`motion/react`）/ zustand 5 / vitest
