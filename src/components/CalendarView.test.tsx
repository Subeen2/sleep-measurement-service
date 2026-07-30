import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarView } from './CalendarView';
import { SleepEntry } from '../lib/sleepTypes';

function makeEntry(date: string, overallCondition: SleepEntry['overallCondition'] = 'refreshed'): SleepEntry {
  return {
    date,
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition,
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
  };
}

describe('CalendarView', () => {
  it('renders one button per day in the month', () => {
    render(<CalendarView year={2026} month={7} entries={[]} onSelectDate={() => {}} />);
    // July 2026 has 31 days
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('marks days that have an entry with a condition icon', () => {
    render(<CalendarView year={2026} month={7} entries={[makeEntry('2026-07-15', 'refreshed')]} onSelectDate={() => {}} />);
    const day15 = screen.getByText('15').closest('button')!;
    expect(day15.textContent).toContain('😊');
  });

  it('calls onSelectDate with the full YYYY-MM-DD when a day is clicked', async () => {
    const onSelectDate = vi.fn();
    render(<CalendarView year={2026} month={7} entries={[]} onSelectDate={onSelectDate} />);

    await userEvent.click(screen.getByText('9').closest('button')!);

    expect(onSelectDate).toHaveBeenCalledWith('2026-07-09');
  });

  it('applies the selected class to the currently selected date', () => {
    render(
      <CalendarView year={2026} month={7} entries={[]} selectedDate="2026-07-09" onSelectDate={() => {}} />
    );
    expect(screen.getByText('9').closest('button')).toHaveClass('calendar-view__day--selected');
  });
});
