/**
 * ペット（キャラ）データ。ChatGPT「秋プロ」での整理を作り直したもの。
 *
 * 作り直しの要点
 * 1. 「種族の定義（変わらない）」「育成の保存データ（変わる）」「いまの調子（毎回計算）」を分ける。
 *    調子は保存しない。保存すると生活データと食い違うため。
 * 2. アニメーションは 20 種を個別に持たず、
 *    姿勢 Pose × 表情 Expression × 一回の動作 Action × 調子による変調 Modulation
 *    の組み合わせで表す。「歩く」を元気・疲れ・眠いで描き分ける方針をそのまま型にした。
 * 3. 罰を与えない。数値には下限があり、病気・死亡・家出の状態を持たない。
 *    データが足りないときは値を推測せず null（不明）にする。
 */

// ---------- 種族（変わらない定義） ----------

export type Temperament = 'genki' | 'nonbiri' | 'koukishin';

export type SpeciesId = 'komugi' | 'omochi' | 'potato';

export type SpeciesDef = {
  id: SpeciesId;
  /** 種族名（ユーザーが付ける名前とは別） */
  label: string;
  animal: 'いぬ' | 'くま' | 'ねこ';
  temperament: Temperament;
  temperamentLabel: string;
  blurb: string;
  palette: { body: string; belly: string; accent: string; cheek: string; line: string };
  ears: 'floppy' | 'round' | 'pointy';
  tail: 'wag' | 'puff' | 'curl';
  /** 動きの個性。調子による変調はこれに掛け合わせる */
  motion: {
    /** 床のマス/秒 */
    walkSpeed: number;
    /** 歩くときの跳ね（px） */
    bounce: number;
    /** 呼吸 1 回の秒数 */
    breath: number;
    /** まばたき間隔（ms）の範囲 */
    blinkEvery: [number, number];
    /** ひとりで歩き回る頻度（0〜1） */
    wander: number;
  };
  likes: { furniture: string[]; food: string[] };
};

// ---------- 育成の保存データ ----------

export type Vitals = {
  /** 元気。睡眠記録から決まる。睡眠記録がなければ null（不明） */
  energy: number | null;
  /** おなか。食事記録で増え、時間で減る */
  fullness: number;
  /** かしこさ。その日のタスク・集中で増える */
  smarts: number;
};

export type Growth = {
  /** 集中力・計画力・生活リズム。日をまたいで少しずつ伸びる */
  focus: number;
  planning: number;
  rhythm: number;
};

export type PetSave = {
  speciesId: SpeciesId;
  name: string;
  level: number;
  xp: number;
  /** 親密度 0〜100 */
  bond: number;
  vitals: Vitals;
  growth: Growth;
  asleepSince: number | null;
  /** 最後に時間経過を反映した時刻（ms） */
  lastTick: number;
};

// ---------- いまの調子（計算するだけ） ----------

export type Mood = 'happy' | 'calm' | 'sleepy' | 'hungry' | 'tired' | 'bored' | 'asleep';

export type Condition = {
  mood: Mood;
  /** 吹き出しなどに出す一言の種類 */
  reason: string;
  modulation: Modulation;
};

export type Pose = 'stand' | 'walk' | 'sit' | 'lie' | 'sleep';
export type Expression = 'neutral' | 'happy' | 'love' | 'sleepy' | 'tired' | 'bored' | 'surprised' | 'focused';
export type Action = 'none' | 'jump' | 'stretch' | 'yawn' | 'eat' | 'study' | 'celebrate' | 'shake' | 'nod' | 'sniff';

/** 調子による変調。全モーションに掛ける */
export type Modulation = {
  speed: number;
  bounce: number;
  /** 耳の垂れ 0〜1 */
  earDroop: number;
  /** 目の開き 0〜1 */
  eyeOpen: number;
  idleExpression: Expression;
};

export const VITAL_FLOOR = { energy: 15, fullness: 10, smarts: 0 } as const;

const MODS: Record<Mood, Modulation> = {
  happy: { speed: 1.15, bounce: 1.3, earDroop: 0, eyeOpen: 1, idleExpression: 'happy' },
  calm: { speed: 1, bounce: 1, earDroop: 0.1, eyeOpen: 1, idleExpression: 'neutral' },
  sleepy: { speed: 0.7, bounce: 0.5, earDroop: 0.5, eyeOpen: 0.55, idleExpression: 'sleepy' },
  hungry: { speed: 0.85, bounce: 0.7, earDroop: 0.35, eyeOpen: 0.9, idleExpression: 'bored' },
  tired: { speed: 0.6, bounce: 0.4, earDroop: 0.7, eyeOpen: 0.7, idleExpression: 'tired' },
  bored: { speed: 0.9, bounce: 0.8, earDroop: 0.25, eyeOpen: 0.85, idleExpression: 'bored' },
  asleep: { speed: 0, bounce: 0, earDroop: 0.6, eyeOpen: 0, idleExpression: 'sleepy' },
};

/**
 * 調子を決める。優先順は「眠っている → 疲れ → おなか → 眠気 → 退屈 → ご機嫌」。
 * 責める言い方の理由は付けない（reason は吹き出しの文例キー）。
 */
export function conditionOf(pet: PetSave, hour: number, interactedRecently: boolean): Condition {
  const { energy, fullness, smarts } = pet.vitals;
  let mood: Mood;
  let reason: string;
  if (pet.asleepSince !== null) {
    mood = 'asleep';
    reason = 'asleep';
  } else if (energy !== null && energy < 30) {
    mood = 'tired';
    reason = 'low-energy';
  } else if (fullness < 30) {
    mood = 'hungry';
    reason = 'hungry';
  } else if ((hour >= 23 || hour < 5) && (energy === null || energy < 70)) {
    mood = 'sleepy';
    reason = 'late-night';
  } else if (!interactedRecently && smarts < 20 && hour >= 13) {
    mood = 'bored';
    reason = 'bored';
  } else if ((energy ?? 60) >= 70 && fullness >= 60) {
    mood = 'happy';
    reason = 'good';
  } else {
    mood = 'calm';
    reason = 'calm';
  }
  return { mood, reason, modulation: MODS[mood] };
}

// ---------- 成長 ----------

/** 次のレベルまでに要る経験値 */
export function xpToNext(level: number): number {
  return 20 + (level - 1) * 12;
}

export const UNLOCKS: { level: number; title: string; detail: string }[] = [
  { level: 2, title: 'リアクションがふえる', detail: 'なでたときの反応が 3 種類に' },
  { level: 3, title: 'お気に入りの待機モーション', detail: '種族ごとの癖が見られる' },
  { level: 5, title: 'きせかえ', detail: '帽子とマフラーを着けられる' },
  { level: 7, title: '家具のおねだり', detail: '好きな家具を教えてくれる' },
  { level: 10, title: 'とくべつな一日', detail: '親密度イベントが起きる' },
];

export function addXp(level: number, xp: number, gain: number): { level: number; xp: number; leveledUp: number[] } {
  let l = level;
  let x = xp + gain;
  const leveledUp: number[] = [];
  while (x >= xpToNext(l)) {
    x -= xpToNext(l);
    l += 1;
    leveledUp.push(l);
  }
  return { level: l, xp: x, leveledUp };
}

/** 吹き出しの一言。責めない・指示しない・いつでも戻れる */
export const VOICE: Record<string, string[]> = {
  good: ['きょうはいい感じ！', 'ねえねえ、あそぼ', 'ふふ、ごきげん'],
  calm: ['のんびりしてるよ', 'なにしよっかな', 'となりにいるね'],
  'low-energy': ['ちょっと眠いかも…', 'きょうはゆっくりでいいよね', 'ふぁ…'],
  hungry: ['おなかすいたなぁ', 'ごはんのにおい…？'],
  'late-night': ['そろそろねむいね', 'あしたもあるよ'],
  bored: ['ひまだなぁ', 'なにかいっしょにやる？'],
  asleep: ['すぅ…すぅ…'],
  petted: ['えへへ', 'もっと〜', 'うれしい！'],
  poked: ['わっ', 'なになに？', '！'],
};
