import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PetFigure } from '../art/Pet';
import { SvgDefs } from '../art/Room';
import { speciesById } from '../data/species';
import { applyLight, labelFor, lightAt } from '../domain/daylight';
import { MODS } from '../domain/pet';
import { Island } from '../ui/Island';
import { Bar, Ring } from '../ui/gauges';
import { Coin, IconBook, IconBag, IconBrush, IconFocus, IconHome, IconMoon, IconSound } from '../ui/icons';
import { TabBar, type TabItem } from '../ui/TabBar';
import { MiniFace, SideBackdrop } from './SideArt';
import { BAND_H, BAND_W, HOME_ZONE, ZONES, neighborOf, scrollRatio, viewRatio, zoneIndexAt } from './zones';

/** 見せる時刻は深夜 0:28 に固定（これは別案のモックアップ） */
const HOUR = 0 + 28 / 60;
const TIME_TEXT = '0:28';

const TABS: TabItem<'home' | 'focus' | 'records' | 'shop'>[] = [
  { id: 'home', label: 'へや', icon: (on) => <IconHome filled={on} /> },
  { id: 'focus', label: '集中', icon: (on) => <IconFocus filled={on} /> },
  { id: 'records', label: 'きろく', icon: (on) => <IconBook filled={on} /> },
  { id: 'shop', label: 'おみせ', icon: (on) => <IconBag filled={on} /> },
];

/** 区画ごとの値。記録がないものは推測せず「不明」 */
const VALUES = [
  { text: '不明', unit: '' },
  { text: '0', unit: '回' },
  { text: '0', unit: '分' },
  { text: '0', unit: '/3' },
] as const;

const species = speciesById.komugi;

/** 帯の中のこむぎ。ラグの上のざぶとんで、眠そうに座っている */
const PET = { x: 540, feetY: 618, size: 160 };

/** 部屋の帯（背景の絵＋こむぎ＋吹き出し）。パノラマ書き出しにもそのまま使う */
export function SideBand() {
  const k = PET.size / 190;
  // PetFigure の viewBox は -95 -160 190 175。足もと (0,0) が PET.x, PET.feetY に来るよう置く
  const left = PET.x - 95 * k;
  const top = PET.feetY - 160 * k;
  return (
    <div className="sr-band" style={{ width: BAND_W, height: BAND_H }}>
      <SideBackdrop />
      <div className="sr-pet" style={{ left, top }} data-part="komugi">
        <PetFigure species={species} pose="sit" expression="neutral" modulation={MODS.calm} size={PET.size} props={false} />
      </div>
      <div className="sr-bubble" style={{ left: PET.x - 66, top: 486 }} data-part="bubble">
        そろそろ ねよっか？
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="statusbar" data-light="true" aria-hidden>
      <div className="statusbar-time num">{TIME_TEXT}</div>
      <div className="statusbar-icons">
        <svg width="18" height="12" viewBox="0 0 18 12">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="1" fill="currentColor" />
          ))}
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <path d="M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0z" fill="currentColor" />
          <path d="M3.3 6.4a6.6 6.6 0 0 1 9.4 0" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M1 3.9a9.9 9.9 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.6" y="0.6" width="22.8" height="11.8" rx="3.6" stroke="currentColor" strokeOpacity="0.4" fill="none" />
          <rect x="2.4" y="2.4" width="16.4" height="8.2" rx="2" fill="currentColor" />
          <path d="M25 4.4v4.2a2.2 2.2 0 0 0 0-4.2z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z" fill="currentColor" fillOpacity={0.18} />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SideRoom() {
  const deviceRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState(HOME_ZONE);
  const [ratio, setRatio] = useState(scrollRatio(ZONES[HOME_ZONE].snap));
  const frame = useRef(0);

  // 深夜の光を端末の枠へ（トークンの変数を夜の色にする）
  useLayoutEffect(() => {
    if (deviceRef.current) applyLight(deviceRef.current, lightAt(HOUR));
  }, []);

  // 初期位置はちゃのま。描画直後に合わせるので、見た目のジャンプは出ない
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = ZONES[HOME_ZONE].snap;
  }, []);

  const onScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      setZone(zoneIndexAt(el.scrollLeft));
      setRatio(scrollRatio(el.scrollLeft));
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const goTo = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ left: ZONES[i].snap, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const prev = neighborOf(zone, -1);
  const next = neighborOf(zone, 1);
  const here = ZONES[zone];
  const label = labelFor(HOUR);
  const thumb = viewRatio();

  return (
    <div className="stage">
      <div className="device sr-device" ref={deviceRef}>
        <SvgDefs />
        <div className="sr-app">
          {/* 部屋（横スクロール）。端末の上端から下端まで全面 */}
          <div className="sr-scroll" ref={scrollRef} onScroll={onScroll} role="region" aria-label="へや（左右にスクロール）" tabIndex={0}>
            <SideBand />
            {ZONES.map((z) => (
              <span key={z.id} className="sr-snap" style={{ left: z.snap }} aria-hidden />
            ))}
          </div>
          <div className="sr-shade sr-shade-top" aria-hidden />
          <div className="sr-shade sr-shade-bottom" aria-hidden />

          {/* 上のステータス */}
          <div className="sr-row">
            <div className="sr-pet-id">
              <span className="sr-name display">{species.label}</span>
              <span className="sr-lv num">Lv1</span>
              <span className="sr-xp">
                <Bar value={0.36} color="linear-gradient(90deg, #ffd36b, #ffb648)" height={7} />
              </span>
            </div>
            <div className="sr-row-r">
              <button type="button" className="sr-sound glass" aria-label="音を出す" aria-pressed={false}>
                <IconSound size={19} />
              </button>
              <div className="sr-coin glass" aria-label="コイン 44">
                <Coin size={22} />
                <span className="num">44</span>
              </div>
            </div>
          </div>

          <div className="sr-vitals">
            {[
              { label: '元気', value: null, color: 'var(--sprout)' },
              { label: 'おなか', value: 49, color: 'var(--peach)' },
              { label: 'かしこさ', value: 13, color: 'var(--sky)' },
            ].map((v) => (
              <div key={v.label} className="sr-vital" aria-label={`${v.label} ${v.value === null ? '不明' : v.value}`}>
                <Ring value={v.value} color={v.color} size={30} stroke={4.5} />
                <span className="sr-vital-text">
                  <span className="sr-vital-label">{v.label}</span>
                  <span className="sr-vital-value num" data-unknown={v.value === null}>
                    {v.value === null ? '不明' : v.value}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="sr-chips">
            <div className="sr-chip sr-where">
              <IconMoon size={16} filled />
              <span>{label}</span>
              <span className="num">{TIME_TEXT}</span>
              <span className="sr-where-sep" aria-hidden />
              <PinIcon />
              <span className="sr-where-name" aria-live="polite">
                {here.name}
              </span>
            </div>
            <button type="button" className="sr-chip sr-edit" aria-label="もようがえ">
              <IconBrush size={17} />
              <span>もようがえ</span>
            </button>
          </div>

          {/* 左右の端のつまみ（となりの場所の名前） */}
          {prev !== null && (
            <button type="button" className="sr-peek sr-peek-l" onClick={() => goTo(prev)} aria-label={`${ZONES[prev].name}へ移動`}>
              <span className="sr-peek-arrow" aria-hidden>‹</span>
              <span className="sr-peek-name">{ZONES[prev].name}</span>
            </button>
          )}
          {next !== null && (
            <button type="button" className="sr-peek sr-peek-r" onClick={() => goTo(next)} aria-label={`${ZONES[next].name}へ移動`}>
              <span className="sr-peek-name">{ZONES[next].name}</span>
              <span className="sr-peek-arrow" aria-hidden>›</span>
            </button>
          )}

          {/* へやマップ（場所の一覧を兼ねる） */}
          <nav className="sr-map glass" aria-label="へやマップ">
            <div className="sr-map-cells">
              {ZONES.map((z, i) => (
                <button
                  key={z.id}
                  type="button"
                  className="sr-cell"
                  data-here={i === zone}
                  aria-current={i === zone ? 'true' : undefined}
                  aria-label={`${z.name}へ移動、${z.topic} ${VALUES[i].text}${VALUES[i].unit}`}
                  onClick={() => goTo(i)}
                >
                  <span className="sr-cell-top">
                    <span className="sr-dot" style={{ background: z.color }} />
                    <span className="sr-cell-name">{z.topic}</span>
                  </span>
                  <span className="sr-cell-value num" data-unknown={VALUES[i].text === '不明'}>
                    {VALUES[i].text}
                    {VALUES[i].unit && <span className="sr-unit">{VALUES[i].unit}</span>}
                  </span>
                  {z.id === 'chanoma' && (
                    <span className="sr-here-pet" aria-hidden>
                      <MiniFace size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="sr-rail" aria-hidden>
              <span className="sr-rail-thumb" style={{ width: `${thumb * 100}%`, left: `${ratio * (1 - thumb) * 100}%` }} />
            </div>
          </nav>

          <TabBar tabs={TABS} active="home" onChange={() => undefined} />
        </div>
        <StatusBar />
        <Island />
      </div>
    </div>
  );
}
