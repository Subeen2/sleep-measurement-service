import { SleepEntry } from './sleepTypes';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Resolves HH:mm clock times known to occur in chronological order
 * (possibly crossing midnight) into minute offsets from the first time,
 * rolling each subsequent time forward by 24h whenever it would
 * otherwise appear earlier than the one before it.
 */
export function resolveSequentialMinutes(times: string[]): number[] {
  const result: number[] = [];
  let dayOffset = 0;
  for (let i = 0; i < times.length; i++) {
    let absolute = toMinutes(times[i]) + dayOffset * 1440;
    if (i > 0 && absolute < result[i - 1]) {
      dayOffset += 1;
      absolute += 1440;
    }
    result.push(absolute);
  }
  return result;
}

export function calculateEstimatedSleepMinutes(
  entry: Pick<SleepEntry, 'bedTime' | 'lastScreenTime' | 'wakeTime'>
): number {
  const [, lastScreenAbs, wakeAbs] = resolveSequentialMinutes([
    entry.bedTime,
    entry.lastScreenTime,
    entry.wakeTime,
  ]);
  return wakeAbs - lastScreenAbs;
}

export function calculateRestlessMinutes(
  entry: Pick<SleepEntry, 'bedTime' | 'lastScreenTime' | 'wakeTime'>
): number {
  const [bedAbs, lastScreenAbs] = resolveSequentialMinutes([
    entry.bedTime,
    entry.lastScreenTime,
    entry.wakeTime,
  ]);
  return lastScreenAbs - bedAbs;
}

export function formatMinutesAsDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
