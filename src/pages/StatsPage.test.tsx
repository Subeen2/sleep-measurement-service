import { render, screen } from '@testing-library/react';
import { StatsPage } from './StatsPage';
import * as sleepStorage from '../lib/sleepStorage';
import { SleepEntry } from '../lib/sleepTypes';

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

describe('StatsPage', () => {
  it('shows a friendly empty state when there are no entries yet', () => {
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([]);
    render(<StatsPage />);
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
  });

  it('shows both statistics summaries computed from real entries', () => {
    // Same three entries as sleepStats.test.ts's bestSleepDurationBucket case,
    // reused here so the expected buckets below are already verified by Task 11's tests.
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([
      makeEntry({ date: '2026-07-01', lastScreenTime: '00:00', wakeTime: '06:30', overallCondition: 'tired' }),
      makeEntry({ date: '2026-07-02', lastScreenTime: '00:00', wakeTime: '07:30', overallCondition: 'refreshed' }),
      makeEntry({ date: '2026-07-03', lastScreenTime: '00:00', wakeTime: '07:45', overallCondition: 'better_than_usual' }),
    ]);
    render(<StatsPage />);

    expect(screen.getByText('가장 컨디션이 좋았던 잠든 시간대')).toBeInTheDocument();
    expect(screen.getByText('가장 컨디션이 좋았던 수면 시간')).toBeInTheDocument();
    // All three share the same last-screen-time bucket (00시~02시), so it's trivially the "best".
    expect(screen.getByText('00시~02시')).toBeInTheDocument();
    // 7~8시간 (tired 0, refreshed 2 -> avg 1.5) beats 6~7시간 (tired only -> avg 0).
    expect(screen.getByText('7~8시간')).toBeInTheDocument();
  });
});
