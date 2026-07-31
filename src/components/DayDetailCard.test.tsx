import { render, screen } from '@testing-library/react';
import { DayDetailCard } from './DayDetailCard';
import { SleepEntry } from '../lib/sleepTypes';

const BASE_ENTRY: SleepEntry = {
  date: '2026-07-28',
  bedTime: '23:00',
  lastScreenTime: '23:30',
  wakeTime: '07:00',
  overallCondition: 'refreshed',
  physicalCondition: 'none',
  caffeineShots: 0,
  hadAlcohol: false,
};

describe('DayDetailCard', () => {
  it('always shows the date, estimated duration, times, and both condition labels', () => {
    render(<DayDetailCard entry={BASE_ENTRY} />);
    expect(screen.getByText('2026-07-28')).toBeInTheDocument();
    expect(screen.getByText(/7시간 30분/)).toBeInTheDocument();
    expect(screen.getByText(/뒤척인 시간.*0시간 30분/)).toBeInTheDocument();
    expect(screen.getByText(/개운함/)).toBeInTheDocument();
    expect(screen.getByText(/안아픔/)).toBeInTheDocument();
  });

  it('does not show caffeine, alcohol, or meal rows when they were not recorded', () => {
    render(<DayDetailCard entry={BASE_ENTRY} />);
    expect(screen.queryByText(/카페인/)).not.toBeInTheDocument();
    expect(screen.queryByText(/음주/)).not.toBeInTheDocument();
    expect(screen.queryByText(/마지막 식사/)).not.toBeInTheDocument();
  });

  it('shows caffeine, alcohol, and meal rows when they were recorded', () => {
    const entry: SleepEntry = {
      ...BASE_ENTRY,
      caffeineShots: 2,
      caffeineTime: '14:00',
      hadAlcohol: true,
      alcoholType: 'beer',
      lastMealTime: '19:00',
    };
    render(<DayDetailCard entry={entry} />);
    expect(screen.getByText(/카페인: 2샷 \(14:00\)/)).toBeInTheDocument();
    expect(screen.getByText(/음주: 맥주/)).toBeInTheDocument();
    expect(screen.getByText(/마지막 식사: 19:00/)).toBeInTheDocument();
  });
});
