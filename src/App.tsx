import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SvgDefs } from './art/Room';
import { applyLight, lightAt } from './domain/daylight';
import { DemoSheet, DemoSide } from './screens/DemoPanel';
import { FocusScreen } from './screens/Focus';
import { Home, type HomeTab } from './screens/home/Home';
import { LevelUpModal } from './screens/LevelUp';
import { Onboarding } from './screens/Onboarding';
import { RecordsScreen } from './screens/Records';
import { ShopScreen } from './screens/Shop';
import { hourOf, now, useApp, useNow } from './store';
import { Soundscape } from './ui/Soundscape';
import { FxLayer } from './ui/FxLayer';
import { IconBag, IconBook, IconFocus, IconHome } from './ui/icons';
import { Island } from './ui/Island';
import { spring } from './ui/motion';
import { TabBar, type TabItem } from './ui/TabBar';
import './App.css';

type Tab = 'home' | HomeTab;

const TABS: TabItem<Tab>[] = [
  { id: 'home', label: 'へや', icon: (on) => <IconHome filled={on} /> },
  { id: 'focus', label: '集中', icon: (on) => <IconFocus filled={on} /> },
  { id: 'records', label: 'きろく', icon: (on) => <IconBook filled={on} /> },
  { id: 'shop', label: 'おみせ', icon: (on) => <IconBag filled={on} /> },
];
const ORDER: Tab[] = TABS.map((t) => t.id);

/** タブの並びに合わせて、右のタブは右から・左のタブは左から入る */
const swap = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, scale: 0.985, transition: { duration: 0.16 } }),
};

/** 部屋の光を端末の枠へ流す。手動のランプは自動より優先する */
function useLivingLight(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const st = useApp.getState();
      const light = lightAt(hourOf(now()), st.pet.asleepSince !== null);
      if (st.lampOn !== null) light.lampGlow = st.lampOn ? 1 : 0.05;
      applyLight(el, light);
    };
    apply();
    const unsub = useApp.subscribe((s, prev) => {
      if (s.clockOffset !== prev.clockOffset || s.lampOn !== prev.lampOn || s.pet.asleepSince !== prev.pet.asleepSince) apply();
    });
    const id = window.setInterval(apply, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [ref]);
}

function StatusBar({ onClock, light }: { onClock: () => void; light: boolean }) {
  const t = useNow(1000);
  const d = new Date(t);
  return (
    <div className="statusbar" data-light={light} aria-hidden>
      <button type="button" className="statusbar-time num" onClick={onClock} tabIndex={-1} title="デモ操作">
        {d.getHours()}:{String(d.getMinutes()).padStart(2, '0')}
      </button>
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

export function App() {
  const onboarded = useApp((s) => s.onboarded);
  const [tab, setTab] = useState<Tab>('home');
  const [dir, setDir] = useState(1);
  const [immersive, setImmersive] = useState(false);
  const [homeHidesBar, setHomeHidesBar] = useState(false);
  const [shopModal, setShopModal] = useState(false);
  const [placeRequest, setPlaceRequest] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const deviceRef = useRef<HTMLDivElement>(null);

  useLivingLight(deviceRef);

  // 放っておいた時間の分だけおなかが減る、などを定期的に反映する
  useEffect(() => {
    const id = window.setInterval(() => useApp.getState().refresh(), 15_000);
    const onVis = () => document.visibilityState === 'visible' && useApp.getState().refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const tabRef = useRef(tab);
  tabRef.current = tab;
  const go = useCallback((next: Tab) => {
    const cur = tabRef.current;
    if (cur === next) return;
    setDir(ORDER.indexOf(next) > ORDER.indexOf(cur) ? 1 : -1);
    setTab(next);
  }, []);

  const onPlace = useCallback(
    (id: string) => {
      setPlaceRequest(id);
      go('home');
    },
    [go],
  );

  const barHidden = immersive || (tab === 'home' && homeHidesBar) || (tab === 'shop' && shopModal) || !onboarded;

  return (
    <div className="stage">
      <div className="device" ref={deviceRef}>
        <SvgDefs />
        <Soundscape focusing={immersive} />
        <div className="app">
          <Home
            active={tab === 'home'}
            onNavigate={go}
            onTabBarHidden={setHomeHidesBar}
            placeRequest={placeRequest}
            onPlaceHandled={() => setPlaceRequest(null)}
          />
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            {tab !== 'home' && (
              <motion.div
                key={tab}
                className="screen-swap"
                custom={dir}
                variants={swap}
                initial="enter"
                animate="center"
                exit="exit"
                transition={spring.smooth}
              >
                {tab === 'focus' && <FocusScreen onImmersive={setImmersive} />}
                {tab === 'records' && <RecordsScreen />}
                {tab === 'shop' && <ShopScreen onPlace={onPlace} onModal={setShopModal} />}
              </motion.div>
            )}
          </AnimatePresence>
          <TabBar tabs={TABS} active={tab} onChange={go} hidden={barHidden} />
          <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
          {!onboarded && <Onboarding />}
          <LevelUpModal />
          <FxLayer />
        </div>
        <StatusBar onClock={() => setDemoOpen(true)} light={immersive} />
        <Island />
      </div>
      <DemoSide />
    </div>
  );
}
