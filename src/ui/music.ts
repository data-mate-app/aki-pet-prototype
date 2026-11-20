/**
 * BGM と環境音。曲はループする素材を重ねておき、場面に合わせて音量を入れ替える（クロスフェード）。
 *
 * - 部屋: 昼の曲 / 夜の曲（時刻と、寝ているかで決まる → domain/soundscape.ts）
 * - 集中: 音楽は止め、選んだときだけ雨音
 *
 * 最初のタップまでは何も読まない。音を止めているあいだは素材も止める（電池のため）。
 */
import type { MusicScene } from '../domain/soundscape';
import dayUrl from '../assets/audio/bgm_day.mp3';
import nightUrl from '../assets/audio/bgm_night.mp3';
import rainUrl from '../assets/audio/bgm_rain.mp3';
import { getAudio, loadClip, musicOut, onAudioUnlock, rampTo } from './audio';

type TrackId = 'day' | 'night' | 'rain';

const TRACKS: Record<TrackId, { url: string; gain: number }> = {
  day: { url: dayUrl, gain: 0.3 },
  night: { url: nightUrl, gain: 0.34 },
  rain: { url: rainUrl, gain: 0.5 },
};

const FADE_IN = 2.4;
const FADE_OUT = 1.6;

type Live = { src: AudioBufferSourceNode; gain: GainNode; stopTimer?: number };
const live: Partial<Record<TrackId, Live>> = {};
const starting = new Set<TrackId>();

let enabled = true;
let scene: MusicScene = 'none';
let rain = false;
let ready = false;

function wanted(): Record<TrackId, boolean> {
  return {
    day: enabled && scene === 'day',
    night: enabled && scene === 'night',
    rain,
  };
}

function apply() {
  if (!ready) return;
  const want = wanted();
  for (const id of Object.keys(TRACKS) as TrackId[]) {
    const cur = live[id];
    if (want[id]) {
      if (cur) {
        window.clearTimeout(cur.stopTimer);
        cur.stopTimer = undefined;
        rampTo(cur.gain.gain, TRACKS[id].gain, FADE_IN);
      } else {
        void start(id);
      }
    } else if (cur && cur.stopTimer === undefined) {
      rampTo(cur.gain.gain, 0, FADE_OUT);
      cur.stopTimer = window.setTimeout(() => stop(id), FADE_OUT * 1000 + 120);
    }
  }
}

async function start(id: TrackId) {
  if (starting.has(id)) return;
  starting.add(id);
  const clip = await loadClip(TRACKS[id].url, { loop: true });
  starting.delete(id);
  const ac = getAudio();
  const out = musicOut();
  // 読み込んでいるあいだに場面が変わったら鳴らさない
  if (!clip || !ac || !out || !wanted()[id] || live[id]) return;
  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  const src = ac.createBufferSource();
  src.buffer = clip.buffer;
  src.loop = true;
  src.loopStart = clip.start;
  src.loopEnd = clip.end;
  src.connect(gain);
  src.start(0, clip.start);
  live[id] = { src, gain };
  rampTo(gain.gain, TRACKS[id].gain, FADE_IN);
}

function stop(id: TrackId) {
  const cur = live[id];
  if (!cur) return;
  try {
    cur.src.stop();
  } catch {
    /* すでに止まっている */
  }
  cur.src.disconnect();
  cur.gain.disconnect();
  delete live[id];
}

onAudioUnlock(() => {
  ready = true;
  apply();
});

export function setMusicEnabled(on: boolean) {
  if (enabled === on) return;
  enabled = on;
  apply();
}

export function setMusicScene(next: MusicScene) {
  if (scene === next) return;
  scene = next;
  apply();
}

/** 集中中の雨音。BGM の設定とは別に、画面のボタンで選ぶ */
export function setRain(on: boolean) {
  if (rain === on) return;
  rain = on;
  apply();
}
