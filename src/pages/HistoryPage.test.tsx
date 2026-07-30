import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPage } from './HistoryPage';
import * as sleepStorage from '../lib/sleepStorage';
import { SleepEntry } from '../lib/sleepTypes';

const ENTRY: SleepEntry = {
  date: '2026-07-15',
  bedTime: '23:00',
  lastScreenTime: '23:30',
  wakeTime: '07:00',
  overallCondition: 'refreshed',
  physicalCondition: 'none',
  caffeineShots: 0,
  hadAlcohol: false,
};

beforeEach(() => {
  // setSystemTime alone (without useFakeTimers) mocks only `Date`, leaving
  // setTimeout/etc. real — important because userEvent.click uses real
  // timers internally and would hang if timers were fully faked here.
  vi.setSystemTime(new Date(2026, 6, 28)); // July 28, 2026
  vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([ENTRY]);
  vi.spyOn(sleepStorage, 'getEntry').mockImplementation((date: string) => (date === ENTRY.date ? ENTRY : null));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HistoryPage', () => {
  it('shows the current month and year by default', () => {
    render(<HistoryPage />);
    expect(screen.getByText('2026년 7월')).toBeInTheDocument();
  });

  it('shows the day detail card when a logged day is selected', async () => {
    render(<HistoryPage />);
    await userEvent.click(screen.getByText('15').closest('button')!);
    expect(screen.getByText('2026-07-15')).toBeInTheDocument();
  });

  it('navigates to the previous and next month and clears the selection', async () => {
    render(<HistoryPage />);
    await userEvent.click(screen.getByText('15').closest('button')!);

    await userEvent.click(screen.getByText('◀'));
    expect(screen.getByText('2026년 6월')).toBeInTheDocument();
    expect(screen.queryByText('2026-07-15')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('▶'));
    await userEvent.click(screen.getByText('▶'));
    expect(screen.getByText('2026년 8월')).toBeInTheDocument();
  });

  it('rolls the year over when navigating past January or December', async () => {
    render(<HistoryPage />);
    for (let i = 0; i < 7; i++) {
      await userEvent.click(screen.getByText('◀'));
    }
    expect(screen.getByText('2025년 12월')).toBeInTheDocument();
  });
});
