# 音

効果音・BGM・集中中の環境音。素材はすべてこの Mac のローカル Stable Audio 3（audio-studio MCP）で生成し、加工して使っている。
外部の素材サイトや有料サービスは使っていない。

## 鳴る場面

| 音 | 鳴る場面（主なもの） | ファイル |
|---|---|---|
| ぽん（pop） | ボタン、ペットをタップ、記録の確定 | `pop.mp3` / `pop2.mp3`（交互に鳴らす） |
| ことっ（snap） | 家具を置く、箱から出す | `snap.mp3` |
| よろこぶ（chirp） | ペットが喜ぶ、スライダーを最後まで送る | `chirp.mp3` / `chirp2.mp3`（交互） |
| ごろごろ（purr） | なでる | `purr.mp3` |
| もぐもぐ（munch） | ごはん | `munch.mp3` |
| しゅっ（whoosh） | スワイプで消す、家具をしまう | `whoosh.mp3` |
| できた（reward） | 記録できた、初回の完了 | `reward.mp3` |
| コイン（coin） | コインが HUD に届く。続けて届くとド・レ・ミ・ソ・ラと上がる | `coin.mp3` |
| レベルアップ（levelup） | 紙吹雪（レベルアップのときだけ出る） | `levelup.mp3` |
| できない（error） | できない操作 | `error.mp3` |
| タップ・目盛り（tap / tick） | 細かい操作・目盛り送り。頻度が高く短いので合成音のまま | なし |
| 部屋の曲（昼） | 朝・昼・夕方 | `bgm_day.mp3`（カリンバとナイロンギター、80 BPM、31.5 秒のループ） |
| 部屋の曲（夜） | 夜・深夜、ペットが寝ているあいだ | `bgm_night.mp3`（フェルトピアノとオルゴール、64 BPM、32 秒のループ） |
| 雨音 | 集中タイマーが動いているあいだ（画面右上の環境音ボタンで切り替え） | `bgm_rain.mp3` |

どの場面でどの曲にするかは [src/domain/soundscape.ts](../src/domain/soundscape.ts)（テストあり）で決める。集中中は部屋の曲を止める。

## 設定

- 右上の音ボタン（コインの左）: 効果音と BGM をまとめて切り替える。
- デモ操作: 効果音と BGM を別々に切り替えられる。「音を聞く」で全部の効果音を聞き比べられる（コインは 5 枚続けて鳴らす）。
- 設定は localStorage に残る。

## 仕組み

[src/ui/audio.ts](../src/ui/audio.ts) が 1 つの AudioContext を持ち、効果音（[feedback.ts](../src/ui/feedback.ts)）と BGM（[music.ts](../src/ui/music.ts)）が共有する。

```
効果音 ───────────────┐
                       ├─ コンプレッサー（重なっても割れない） → スピーカー
BGM ─ ダック（効果音の間だけ下げる）┘
```

- ブラウザは触られるまで音を出せない。最初のタップで AudioContext を起こし、そこで素材を読み込んで BGM をフェードインする。
- 画面が隠れたら止め、戻ったら再開する。
- 同じ効果音を毎回わずかに音程を変えて鳴らす（機械的に聞こえないように）。ごく短い間隔の連打はまとめる。
- よろこぶ・できた・レベルアップの間は BGM を 40% まで下げる。
- 曲の切り替えはクロスフェード（入り 2.4 秒・出 1.6 秒）。止めている曲は再生も止める。
- MP3 は先頭と末尾に無音が入るので、読み込み時に無音を除いた範囲を求めて（[audioRange.ts](../src/ui/audioRange.ts)、テストあり）、その範囲だけ鳴らす・ループする。
- 素材の読み込み前や読み込めない環境では、同じ役割の合成音で鳴らす。

## 素材の作り方

編集元（FLAC）と生成・加工の記録（JSON）は [assets-src/audio/](../assets-src/audio/) にある。アプリが読むのは [src/assets/audio/](../src/assets/audio/) の MP3（合計 1.2 MB）。

1. **生成**: `generate_audio`（効果音は `audio_type: sfx` で音源・動き・質感・空間を指定、曲は `music` と BPM）。1 つの音につき 2〜4 候補。プロンプトと seed は `assets-src/audio/gen_*.json` に残してあり、同じ seed で作り直せる。
2. **選ぶ**: 候補を耳ではなく**数値で選んだ**（このセッションの担当は音を聞けない）。立ち上がりの位置、鳴っている長さ、音の塊の数（もぐもぐは 3 回、できないは 2 回など）、余韻、明るさ（スペクトル重心）、ノイズっぽさ。曲はテンポとフレーズの区切りを自己相関で求めた。
3. **加工**（`process_audio`）
   - 効果音: 前後の無音を切る → モノラル → ピーク正規化 → 短いフェードアウト。
   - 曲: フレーズの区切りで切り出し（昼 6.0〜37.5 秒、夜 7.5〜39.5 秒）、つなぎ目をクロスフェードしてループにし、ラウドネスを揃える。つなぎ目の段差が通常のサンプル間の変化に収まることを確かめた（プチッと鳴らない）。
4. **書き出し**: 効果音はモノラル 96 kbps（もぐもぐは 7.5 kHz 以上を切る）、できた・レベルアップはステレオ 128 kbps、曲は VBR（q5）。

### 生成した指示（抜粋）

| 音 | seed | 指示 |
|---|---|---|
| pop / pop2 | 1103 / 1101 | soft cartoon bubble pop, single quick pop with a tiny airy tail, round, rubbery, warm mid tone |
| snap | 1202 | small wooden toy block set down on a felt-covered wooden table, single soft knock, muted rounded thock |
| chirp / chirp2 | 1302 / 1301 | tiny cute cartoon creature, toy squeak voice, short happy rising chirp, two quick notes |
| purr | 1403 | small cat purring contentedly, gentle steady rumble that softly fades out |
| munch | 1501 | small pet nibbling a crunchy biscuit, three quick light crunchy bites |
| whoosh | 1602 | soft cloth swish through the air, quick airy whoosh passing by |
| reward | 1701 | glockenspiel and soft bells, quick bright ascending sparkle arpeggio of four notes |
| error | 1801 | soft wooden block, two low muted knocks, the second slightly lower, not harsh |
| coin | 1901 | small gold coin, single bright clink with a short shimmer |
| levelup | 2001 | marimba and glockenspiel, short cheerful ascending fanfare ending on a bright held major chord |
| bgm_day | 3002 | cozy acoustic loop, warm kalimba melody over soft fingerpicked nylon guitar and gentle upright bass, light shaker（80 BPM） |
| bgm_night | 3103 | soft lullaby ambient, gentle felt piano, warm airy pads and a faint music box melody, no drums（64 BPM） |
| bgm_rain | 3202 | gentle rain on a window, steady soft continuous rainfall, no thunder, indoors, slightly distant |

## 差し替えるとき

耳で確かめていないので、気になる音があれば差し替えてほしい。

- 音量だけなら [feedback.ts](../src/ui/feedback.ts) の `samples`（効果音の `gain`）と [music.ts](../src/ui/music.ts) の `TRACKS`（曲の `gain`）を変える。
- 音そのものを替えるときは、同じ名前の MP3 を `src/assets/audio/` に置く。編集元を残すなら FLAC と記録を `assets-src/audio/` へ。
- 効果音は 0.1〜2 秒、先頭に無音を入れない（入っていても読み込み時に切るが、短いほど遅れが出にくい）。
- 曲は継ぎ目でプチッと鳴らないよう、ループ用に加工してから入れる。
