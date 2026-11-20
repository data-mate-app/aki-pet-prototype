import { animate } from 'motion/react';
import { useState } from 'react';
import { labelFor } from '../domain/daylight';
import { hourOf, useApp, useNow } from '../store';
import { BottomSheet } from '../ui/BottomSheet';
import { feedback } from '../ui/feedback';
import { Switch } from '../ui/inputs';
import { ease } from '../ui/motion';
import { Pressable } from '../ui/Pressable';
import './DemoPanel.css';

/*
 * プロトタイプを見せるための操作（本番のアプリには出さない）。
 * PC では端末の横に、スマホでは時計をタップしたときのシートに出す。
 */

const TIMES = [
  { label: '朝', h: 7 },
  { label: '昼', h: 12.5 },
  { label: '夕方', h: 17.6 },
  { label: '夜', h: 21.5 },
  { label: '深夜', h: 1 },
];

const VITALS = [
  { label: '元気いっぱい', v: { energy: 92, fullness: 88, smarts: 64 } },
  { label: 'おなかぺこぺこ', v: { fullness: 10 } },
  { label: 'ねむい', v: { energy: 14 } },
  { label: '元気は不明', v: { energy: null } },
] as const;

/** 時計を指定の時刻へ早送り・巻き戻しする（ずれだけを動かすので、部屋の光が連続して変わる） */
function travelTo(hour: number) {
  const st = useApp.getState();
  const base = new Date(Date.now() + st.clockOffset);
  const target = new Date(base);
  target.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  // 近い方向へ回す（深夜 1 時は「次の日の 1 時」）
  let delta = target.getTime() - base.getTime();
  if (delta < -12 * 3_600_000) delta += 86_400_000;
  if (delta > 12 * 3_600_000) delta -= 86_400_000;
  const from = st.clockOffset;
  feedback('light', 'tick');
  animate(from, from + delta, {
    duration: 1.1,
    ease: ease.inOut,
    onUpdate: (v) => useApp.getState().setClockOffset(v),
    onComplete: () => useApp.getState().refresh(),
  });
}

export function DemoControls() {
  const t = useNow(1000);
  const hour = hourOf(t);
  const offset = useApp((s) => s.clockOffset);
  const sound = useApp((s) => s.sound);
  const [armed, setArmed] = useState(false);
  const d = new Date(t);

  return (
    <div className="demo">
      <section>
        <div className="demo-label">
          時刻 <b className="num">{`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`}</b> <span>{labelFor(hour)}</span>
        </div>
        <div className="demo-chips">
          {TIMES.map((x) => (
            <Pressable key={x.label} className="demo-chip" onPress={() => travelTo(x.h)} haptic={false}>
              {x.label}
            </Pressable>
          ))}
          <Pressable
            className="demo-chip"
            data-ghost
            disabled={Math.abs(offset) < 60_000}
            onPress={() => {
              const from = useApp.getState().clockOffset;
              animate(from, 0, { duration: 0.9, ease: ease.inOut, onUpdate: (v) => useApp.getState().setClockOffset(v) });
            }}
          >
            いまに戻す
          </Pressable>
        </div>
        <input
          className="demo-range"
          type="range"
          min={0}
          max={24}
          step={0.25}
          value={hour}
          aria-label="時刻"
          onChange={(e) => {
            const st = useApp.getState();
            const h = Number(e.target.value);
            const base = new Date(Date.now() + st.clockOffset);
            const target = new Date(base);
            target.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
            st.setClockOffset(st.clockOffset + (target.getTime() - base.getTime()));
          }}
        />
      </section>

      <section>
        <div className="demo-label">ペットの状態</div>
        <div className="demo-chips">
          {VITALS.map((x) => (
            <Pressable
              key={x.label}
              className="demo-chip"
              onPress={() => {
                useApp.getState().setVitals(x.v);
                feedback('light', 'pop');
              }}
            >
              {x.label}
            </Pressable>
          ))}
          <Pressable
            className="demo-chip"
            onPress={() => {
              useApp.getState().addCoins(200);
              feedback('success', 'reward');
            }}
          >
            コイン +200
          </Pressable>
        </div>
      </section>

      <section className="demo-row">
        <span className="demo-label">効果音</span>
        <Switch on={sound} onChange={(v) => useApp.getState().setSound(v)} label="効果音" />
      </section>

      <section>
        <Pressable
          className="demo-reset"
          data-armed={armed}
          haptic={armed ? 'warning' : 'light'}
          onPress={() => {
            if (!armed) {
              setArmed(true);
              window.setTimeout(() => setArmed(false), 2600);
              return;
            }
            setArmed(false);
            useApp.getState().reset();
          }}
        >
          {armed ? 'もう一度押すと、最初からやり直す' : 'データを消して最初から'}
        </Pressable>
      </section>
    </div>
  );
}

const TRY = [
  ['部屋の床をタップ', 'ペットがそこまで歩く'],
  ['ペットをなでる', '指でこするとハートが出る'],
  ['家具をタップ', 'その家具でできることが出る（ベッドでねる・テーブルでごはん）'],
  ['家具を長押し', 'そのまま運べる。下の箱へ入れるとしまえる'],
  ['タブバーをなぞる', '押したまま横へ動かすと印がついてくる'],
  ['集中タブ', 'タイマーを回すと、ペットが机で一緒にがんばる'],
] as const;

/** PC で端末の横に置く説明と操作 */
export function DemoSide() {
  return (
    <aside className="side demo-side">
      <div className="demo-side-head">
        <div className="demo-eyebrow">秋プロジェクト · プロトタイプ</div>
        <h1 className="display">DataMate</h1>
        <p>生活の記録で、ペットと部屋が育つ。記録がない日は「不明」のまま、責めない。</p>
      </div>
      <div className="demo-try">
        <div className="demo-label">さわってみる</div>
        <ul>
          {TRY.map(([a, b]) => (
            <li key={a}>
              <b>{a}</b>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="demo-card">
        <div className="demo-card-title">デモ操作</div>
        <DemoControls />
      </div>
    </aside>
  );
}

/** スマホではステータスバーの時計をタップすると開く */
export function DemoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} detents={[0.62]} title="デモ操作" label="デモ操作">
      <div className="demo-sheet" data-sheet-scroll>
        <DemoControls />
      </div>
    </BottomSheet>
  );
}
