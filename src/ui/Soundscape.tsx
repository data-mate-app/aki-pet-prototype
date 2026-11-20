import { useEffect } from 'react';
import { musicSceneFor } from '../domain/soundscape';
import { hourOf, useApp, useNow } from '../store';
import { installAudioUnlock } from './audio';
import { setSoundEnabled } from './feedback';
import { setMusicEnabled, setMusicScene } from './music';

/** 設定と場面（時刻・寝ている・集中）を音のモジュールへ伝える。画面には何も描かない */
export function Soundscape({ focusing }: { focusing: boolean }) {
  const t = useNow(20_000);
  const asleep = useApp((s) => s.pet.asleepSince !== null);
  const sound = useApp((s) => s.sound);
  const music = useApp((s) => s.music);
  const scene = musicSceneFor(hourOf(t), { asleep, focusing });

  useEffect(() => installAudioUnlock(), []);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => setMusicEnabled(music), [music]);
  useEffect(() => setMusicScene(scene), [scene]);
  return null;
}
