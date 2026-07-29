import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayPage } from './TodayPage';
import * as sleepStorage from '../lib/sleepStorage';
import * as dateUtils from '../lib/dateUtils';
import { SleepEntry } from '../lib/sleepTypes';

const TODAY = '2026-07-28';

const SAVED_ENTRY: SleepEntry = {
  date: TODAY,
  bedTime: '23:00',
  lastScreenTime: '23:30',
  wakeTime: '07:00',
  overallCondition: 'refreshed',
  physicalCondition: 'none',
  caffeineShots: 0,
  hadAlcohol: false,
};

beforeEach(() => {
  vi.spyOn(dateUtils, 'getLocalDateString').mockReturnValue(TODAY);
});

describe('TodayPage', () => {
  it('shows the entry form and a friendly prompt when no entry exists for today', () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(null);
    render(<TodayPage />);

    expect(screen.getByText(/기록해줘요/)).toBeInTheDocument();
    expect(screen.getByLabelText('기상 시간')).toBeInTheDocument();
  });

  it('shows a summary with the estimated sleep duration when today is already logged', () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(SAVED_ENTRY);
    render(<TodayPage />);

    expect(screen.getByText(/기록 완료/)).toBeInTheDocument();
    expect(screen.getByText(/7시간 30분/)).toBeInTheDocument();
    expect(screen.queryByLabelText('기상 시간')).not.toBeInTheDocument();
  });

  it('switches back to the (pre-filled) form when 수정하기 is clicked', async () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(SAVED_ENTRY);
    render(<TodayPage />);

    await userEvent.click(screen.getByText('수정하기'));

    expect(screen.getByLabelText('기상 시간')).toHaveValue('07:00');
  });

  it('saves a new entry and shows the summary after submitting the form', async () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(null);
    const saveSpy = vi.spyOn(sleepStorage, 'saveEntry').mockImplementation(() => {});
    render(<TodayPage />);

    fireEvent.change(screen.getByLabelText('자려고 누운 시간'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('마지막으로 화면을 본 시간'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('기상 시간'), { target: { value: '07:00' } });
    await userEvent.click(screen.getByText('개운함'));
    await userEvent.click(screen.getByText('안아픔'));
    await userEvent.click(screen.getByText('기록하기'));

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ date: TODAY }));
    expect(screen.getByText(/기록 완료/)).toBeInTheDocument();
  });
});
