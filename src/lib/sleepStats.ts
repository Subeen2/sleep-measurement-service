import { SleepEntry } from './sleepTypes';
import { calculateEstimatedSleepMinutes, resolveSequentialMinutes } from './sleepCalc';

const CONDITION_SCORE: Record<SleepEntry['overallCondition'], number> = {
  tired: 0,
  better_than_usual: 1,
  refreshed: 2,
};

export interface BucketStat {
  label: string;
  averageScore: number;
  sampleCount: number;
}

function average(nums: number[]): number {
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function pickBestBucket(groups: Map<string, number[]>): BucketStat | null {
  let best: BucketStat | null = null;
  for (const [label, scores] of groups) {
    const stat: BucketStat = { label, averageScore: average(scores), sampleCount: scores.length };
    if (!best || stat.averageScore > best.averageScore) {
      best = stat;
    }
  }
  return best;
}

export function bestSleepOnsetBucket(entries: SleepEntry[]): BucketStat | null {
  if (entries.length === 0) return null;
  const groups = new Map<string, number[]>();
  for (const entry of entries) {
    const [, lastScreenAbs] = resolveSequentialMinutes([entry.bedTime, entry.lastScreenTime, entry.wakeTime]);
    const hour = Math.floor(lastScreenAbs / 60) % 24;
    const bucketStart = Math.floor(hour / 2) * 2;
    const bucketEnd = (bucketStart + 2) % 24;
    const label = `${String(bucketStart).padStart(2, '0')}시~${String(bucketEnd).padStart(2, '0')}시`;
    const list = groups.get(label) ?? [];
    list.push(CONDITION_SCORE[entry.overallCondition]);
    groups.set(label, list);
  }
  return pickBestBucket(groups);
}

export function bestSleepDurationBucket(entries: SleepEntry[]): BucketStat | null {
  if (entries.length === 0) return null;
  const groups = new Map<string, number[]>();
  for (const entry of entries) {
    const minutes = calculateEstimatedSleepMinutes(entry);
    const hourBucket = Math.floor(minutes / 60);
    const label = `${hourBucket}~${hourBucket + 1}시간`;
    const list = groups.get(label) ?? [];
    list.push(CONDITION_SCORE[entry.overallCondition]);
    groups.set(label, list);
  }
  return pickBestBucket(groups);
}
