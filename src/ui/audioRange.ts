/**
 * 音声の先頭・末尾にある無音を除いた範囲 [start, end)（サンプル数）を返す。
 *
 * MP3 はデコーダによって先頭と末尾に数十ミリ秒の無音（エンコーダの遅延と詰め物）が付く。
 * そのままだと効果音の鳴り始めが遅れ、BGM はループのつなぎ目で一瞬途切れる。
 * maxScan を渡すと、端からその長さまでしか探さない（曲の途中の静かな部分を削らないため）。
 */
export function audibleRange(channels: ArrayLike<number>[], threshold = 1e-4, maxScan?: number): [number, number] {
  const len = channels[0]?.length ?? 0;
  if (len === 0) return [0, 0];
  const scan = Math.min(len, maxScan ?? len);
  const loud = (i: number) => channels.some((c) => Math.abs(c[i]) > threshold);

  let start = 0;
  while (start < scan && !loud(start)) start++;
  if (start === len) return [0, len]; // すべて無音なら手を付けない
  if (start === scan && scan < len) start = 0; // 探す範囲に音がなければ、先頭は削らない

  let end = len;
  const stop = Math.max(start, len - scan);
  while (end > stop && !loud(end - 1)) end--;
  if (end === stop && stop > start && !loud(stop)) end = len;

  return [start, end];
}
