import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import * as sleepStorage from './lib/sleepStorage';
import * as reminder from './lib/reminder';

beforeEach(() => {
  vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(null);
  vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([]);
});

describe('App', () => {
  it('renders the title and starts on the 기록 tab', () => {
    render(<App />);
    expect(screen.getByText('잠순이 잠돌이 일기장')).toBeInTheDocument();
    expect(screen.getByLabelText('기상 시간')).toBeInTheDocument();
  });

  it('switches to the 달력 tab', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('달력'));
    expect(screen.getByText(/\d{4}년 \d{1,2}월/)).toBeInTheDocument();
  });

  it('switches to the 통계 tab', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('통계'));
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
  });

  it('requests notification permission when the bell button is clicked', async () => {
    const spy = vi.spyOn(reminder, 'requestNotificationPermissionAndSync').mockResolvedValue();
    render(<App />);
    await userEvent.click(screen.getByText('🔔 알림 켜기'));
    expect(spy).toHaveBeenCalledOnce();
  });
});
