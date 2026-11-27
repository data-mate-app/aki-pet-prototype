# design/ — Figma 用アセット

アプリの絵（家具・ペット・部屋・壁と床・アイコン）と色・文字を、Figma で編集できる形で書き出したもの。
**この中のファイルは `pnpm design:export` が作る。手で直さない**（直すならアプリ側の絵を直して書き出し直す）。

## 中身

| 場所 | 内容 |
|---|---|
| `svg/` | 編集用の SVG（122 件）。部品ごとにグループが分かれ、名前が付いている |
| `png/` | 確認用の PNG（2 倍）。SVG を Chrome で描いたもの |
| `sheet.svg` / `sheet.png` | 全アセットを並べた一覧シート。PNG は 1 倍 |
| `palette.svg` / `palette.png` | 色と文字の一覧。色見本の四角はレイヤー名が色の名前 |
| `tokens.json` | 色・文字・影の値（W3C Design Tokens 2025.10 形式。色は `colorSpace` / `components` / `alpha` / `hex` のオブジェクト、影は shadow の配列。app / room-light / furniture / book / pet / font） |
| `manifest.json` | 全アセットの一覧（パス・種類・viewBox・大きさ・基準点） |

## 名前の付け方

ファイル名は `{種類}/{名前}_{違い}_{時間}`。

| 部分 | 値 |
|---|---|
| 違い（家具） | なし＝そのまま（壁もの＝正面）、`mirrored`＝左右反転、`wall-left`＝左の壁、`wall-right`＝右の壁 |
| 見え方（壁と床） | なし＝部屋の中の斜めの見え方（部屋の絵と同じ形）、`flat`＝正面から見た平らな形（Figma で柄を描き直す用） |
| 時間 | `day`＝昼（12 時の光）、`night`＝夜（21 時の光）。昼夜で絵が変わる家具・部屋・壁と床だけに付く |
| 状態（ペット） | `{種族}_{状態}`。種族は komugi / omochi / potato |

ペットの状態（17 種）: stand ふつう / happy よろこぶ / love なでられる / surprised おどろく / sleepy ねむい / tired つかれた / bored たいくつ / focused しゅうちゅう / walk あるく / sit すわる / lie ねそべる / sleep ねむる / jump ジャンプ / celebrate おいわい / eat たべる / study べんきょう / yawn あくび

`kind` は furniture（家具）/ thumb（おみせの絵）/ pet / room / room-tint（夜の色かぶせ）/ surface（壁と床の面）/ icon。

### 壁と床（`surface/`、12 件）

面は `wall-left`（左の壁）・`wall-right`（右の壁）・`floor`（床）の 3 つ。名前は `surface/{面}_{day|night}`（斜め）と `surface/{面}_flat_{day|night}`（平ら）。色は部屋と同じ（昼 12 時・夜 21 時の光）。

- 入っているもの: 壁紙（`wallpaper`）・腰壁（`wainscot`＝腰壁・レール・溝）・幅木（`baseboard`）、左の壁だけ隅の陰（`corner-shade`）。床は `floor`・板（`planks`）・壁との境の陰（`floor-edge-shade`）。
- **入れていないもの**: 窓（物なので）、日だまり（`sun-patch`）、床の当たり判定、床・壁の厚み（`slab-*` `wall-top-*` `wall-end-*`。部屋の殻なので `room/` に残る）。
- 斜めの面は部屋と同じ位置関係で描いてある。絵の原点 (0,0) は部屋の奥の角で、`manifest.json` の `anchor` がその viewBox 内の位置（`room/` の絵と、奥の角どうしを合わせれば重なる。`room/` 自体の `anchor` はキャンバスの原点なので、`room/` の絵とは `translate(500 430)` 分ずれている点に注意）。
- 平らな面は 1 マス = 100 の座標で、左上が (0,0)（`anchor` は viewBox の左上からの位置）。向きは `PLANE`（`src/art/iso.ts`）と同じで、u 右・v 下。左の壁は正面から見て左右が反転しない（奥の角が右）。腰壁は下にある。
- 平らな素材を部屋へ戻す行列（奥の角を原点とする部屋の座標。`matrix(a,b,c,d,e,f)` は SVG の `transform` と同じ）:

| 面 | transform |
|---|---|
| 左の壁 | `translate(-433.013 -150) matrix(0.866025,-0.5,0,1,0,0)` |
| 右の壁 | `translate(0 -400) matrix(0.866025,0.5,0,1,0,0)` |
| 床 | `matrix(0.866025,0.5,-0.866025,0.5,0,0)` |

  （左の壁の移動量は `iso(0, 5, 4)`、右の壁は `iso(0, 0, 4)`。`src/art/iso.test.ts` で、3 面とも iso の点に戻ることを確かめている。）

## レイヤー名の対応（主なもの）

SVG の `id` が Figma のレイヤー名になる。元のコードの `data-part` と同じ名前。同じ名前が重なるときは `-2`、`-3` を付ける。

| レイヤー名 | 意味 |
|---|---|
| `shadow` | 足もとの影 |
| `body` / `belly` / `body-shine` | ペットの体 / おなか / つや |
| `ears`（`ear-left` `ear-right`） | 耳 |
| `eyes`（`eye-left` `eye-left-pupil` `eye-left-shine`） | 目・瞳・光 |
| `nose` / `mouth` / `markings` | 鼻 / 口 / 模様 |
| `paws` / `feet` / `tail` | 手 / 足 / しっぽ |
| `leg-N` `drawers` など | 家具の部品（`-left` `-right` `-top` は直方体の面） |
| `room` / `wall-left` / `wall-right` / `wainscot-*` | 部屋の壁・腰板 |
| `d-` で始まるもの | 共有の定義（ぼかし・グラデーション）。`defs` の中 |

`sheet.svg` では、各アセットが `<g id="{種類}-{名前}">`（例 `furniture-bed-oat`、`thumb-bed-oat`）に入り、中の id は `{種類}-{名前}__` が頭に付く。全体で id は重ならない。

## 作り直し方

```
pnpm design:export
```

- **Google Chrome が要る**（playwright-core で `channel: 'chrome'` を起動）。Vite のサーバーは自前で立てる（port 5399 から）。
- PNG と一覧シートの文字には Google Fonts（Dela Gothic One / Zen Maru Gothic）を使うので、ネットにつながっている必要がある。読めないときは代替フォントで書かず、終了コード 1 で止まる。
- 出力は一時ディレクトリに作り、最後まで成功して全件が閾値内のときだけ `design/` の生成物を差し替える。途中で失敗しても `design/` は前回のまま（`README.md` は触らない）。
- 確認用に `DESIGN_OUT`（出力先）と `DESIGN_ONLY`（対象を絞る正規表現）が使える。`DESIGN_ONLY` は `DESIGN_OUT` と一緒のときだけ（なしだと終了コード 1）。
- 書き出した SVG だけを描いた絵と、アプリの実物を 2 倍で撮って画素で比べる。差のある画素が 0.5% を超えるアセットがあれば終了コード 1（そのアセットを表示する）。ふだんの最大は 0.002% ほど。
- 日付などは出力に入れていないので、2 回続けて実行しても全ファイルが同じ内容になる。

方針の違い（作業票の指示から変えたところ）と、意図してそうしているところ:

- おみせの絵（`thumb/`）の viewBox は、実際の絵の範囲ではなく、お店の枠（`THUMB_VIEW`）に合わせた正方形。お店で見える範囲のとおりに書き出すため（絵のまわりに余白がある）。
- 部屋は壁の厚みの端まで書き出す。アプリでは左右がわずかに切れるが、デザイン素材としては全体があるほうがよいため。

- ペットの `eat` は表の stand ではなく **sit**。アプリ（Home.tsx）が sit にしてから eat をするため。
- 変換行列の a〜d は小数 6 桁（3 桁だと比較で崩れる）。
- 比較は、アルファを掛けた値（premultiplied）の差で見る。ぼかしの薄い縁の色ノイズを数えないため。
- Chrome は `--disable-gpu`。GPU だとぼかしの影が実行のたびに 1 バイト単位で変わるため。
- 動きは「止めた 1 コマ」。止めた時点のアニメの値をインライン CSS に焼き込んでいる（レイヤーが別になって滲むのを避けるため）。
- 書き出した SVG の比較用の描画（b）は、実物（a）と同じページ位置・同じ大きさに置く。比べる範囲は viewBox の外側に 8px の余白を足す（範囲の測り漏れを見つけるため）。

## Figma への取り込み

- 1 つずつ: `svg/` のファイルを Figma にドラッグする。
- コピペ: SVG ファイルをテキストエディタで開き、全部コピーして Figma に貼る。
- まとめて: `sheet.svg` をドラッグすると全アセットが一覧で入る。部品はグループなので、取り出して使う。

## 注意

- アニメーションは止めた 1 コマだけ。動きは入らない。
- 影（`feGaussianBlur`）と、部屋の日ざし（`soft-light` の重なり）は、Figma で同じに見えるか **未確認**。ずれたら Figma 側で影のぼかしを手で付ける。
- 文字は Dela Gothic One と Zen Maru Gothic。Figma にも Google Fonts として入っている。
- 基準点（床に置いた位置）は `manifest.json` の `anchor`。座標の原点がアセットの接地点で、`anchor` はその viewBox 内の位置。
- ペットは右向きだけ。左向きは Figma で反転する。
