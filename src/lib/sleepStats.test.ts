import { bestSleepOnsetBucket, bestSleepDurationBucket } from './sleepStats';
import { SleepEntry } from './sleepTypes';

function makeEntry(overrides: Partial<SleepEntry>): SleepEntry {
  return {
    date: '2026-07-01',
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition: 'refreshed',
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
    ...overrides,
  };
}

describe('bestSleepOnsetBucket', () => {
  it('returns null when there are no entries', () => {
    expect(bestSleepOnsetBucket([])).toBeNull();
  });

  it('picks the two-hour last-screen-time bucket with the highest average condition score', () => {
    const entries = [
      // last screen ~22:xx bucket (22시~24시), tired -> score 0
      makeEntry({ date: '2026-07-01', lastScreenTime: '22:15', overallCondition: 'tired' }),
      // last screen ~00:xx bucket (00시~02시), refreshed -> score 2 (twice)
      makeEntry({ date: '2026-07-02', bedTime: '23:50', lastScreenTime: '00:15', wakeTime: '07:00', overallCondition: 'refreshed' }),
      makeEntry({ date: '2026-07-03', bedTime: '23:50', lastScreenTime: '00:30', wakeTime: '07:00', overallCondition: 'refreshed' }),
    ];

    const result = bestSleepOnsetBucket(entries);

    expect(result).toEqual({ label: '00시~02시', averageScore: 2, sampleCount: 2 });
  });
});

describe('bestSleepDurationBucket', () => {
  it('returns null when there are no entries', () => {
    expect(bestSleepDurationBucket([])).toBeNull();
  });

  it('picks the one-hour sleep-duration bucket with the highest average condition score', () => {
    const entries = [
      // 6~7 hours, tired -> score 0
      makeEntry({ date: '2026-07-01', lastScreenTime: '00:00', wakeTime: '06:30', overallCondition: 'tired' }),
      // 7~8 hours, refreshed -> score 2
      makeEntry({ date: '2026-07-02', lastScreenTime: '00:00', wakeTime: '07:30', overallCondition: 'refreshed' }),
      // 7~8 hours, better_than_usual -> score 1
      makeEntry({ date: '2026-07-03', lastScreenTime: '00:00', wakeTime: '07:45', overallCondition: 'better_than_usual' }),
    ];

    const result = bestSleepDurationBucket(entries);

    expect(result).toEqual({ label: '7~8시간', averageScore: 1.5, sampleCount: 2 });
  });

  it('breaks ties by keeping the first-inserted bucket in entry order', () => {
    const entries = [
      makeEntry({ date: '2026-07-01', lastScreenTime: '00:00', wakeTime: '06:30', overallCondition: 'refreshed' }), // 6~7h, score 2
      makeEntry({ date: '2026-07-02', lastScreenTime: '00:00', wakeTime: '07:30', overallCondition: 'refreshed' }), // 7~8h, score 2
    ];

    expect(bestSleepDurationBucket(entries)).toEqual({ label: '6~7시간', averageScore: 2, sampleCount: 1 });
  });
});
