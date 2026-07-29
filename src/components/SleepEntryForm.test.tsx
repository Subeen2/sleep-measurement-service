import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SleepEntryForm } from './SleepEntryForm';
import { SleepEntry } from '../lib/sleepTypes';

describe('SleepEntryForm', () => {
  it('shows an error and does not submit when required fields are missing', async () => {
    const onSubmit = vi.fn();
    render(<SleepEntryForm date="2026-07-28" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByText('기록하기'));

    expect(screen.getByText(/필수예요/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a complete entry with only the required fields filled', async () => {
    const onSubmit = vi.fn();
    render(<SleepEntryForm date="2026-07-28" onSubmit={onSubmit} />);

    // fireEvent.change (not userEvent.type) is used for time inputs: jsdom's
    // value-sanitization for type="time" rejects the partial values that
    // userEvent's keystroke-by-keystroke typing would produce along the way.
    fireEvent.change(screen.getByLabelText('자려고 누운 시간'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('마지막으로 화면을 본 시간'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('기상 시간'), { target: { value: '07:00' } });
    await userEvent.click(screen.getByText('개운함'));
    await userEvent.click(screen.getByText('안아픔'));
    await userEvent.click(screen.getByText('기록하기'));

    expect(onSubmit).toHaveBeenCalledWith({
      date: '2026-07-28',
      bedTime: '23:00',
      lastScreenTime: '23:30',
      wakeTime: '07:00',
      overallCondition: 'refreshed',
      physicalCondition: 'none',
      caffeineShots: 0,
      caffeineTime: undefined,
      hadAlcohol: false,
      alcoholType: undefined,
      lastMealTime: undefined,
    });
  });

  it('reveals the caffeine time field only once shots are greater than zero', async () => {
    render(<SleepEntryForm date="2026-07-28" onSubmit={() => {}} />);
    expect(screen.queryByLabelText('카페인 섭취 시간 (선택)')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('카페인 섭취량 (1샷 기준)'));
    await userEvent.type(screen.getByLabelText('카페인 섭취량 (1샷 기준)'), '2');

    expect(screen.getByLabelText('카페인 섭취 시간 (선택)')).toBeInTheDocument();
  });

  it('reveals the alcohol type picker only once "음주 여부" is checked', async () => {
    render(<SleepEntryForm date="2026-07-28" onSubmit={() => {}} />);
    expect(screen.queryByText('주종')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('음주 여부'));

    expect(screen.getByText('주종')).toBeInTheDocument();
  });

  it('pre-fills fields from an initial entry when editing', () => {
    const initialEntry: SleepEntry = {
      date: '2026-07-28',
      bedTime: '23:00',
      lastScreenTime: '23:30',
      wakeTime: '07:00',
      overallCondition: 'tired',
      physicalCondition: 'headache',
      caffeineShots: 1,
      caffeineTime: '14:00',
      hadAlcohol: true,
      alcoholType: 'beer',
      lastMealTime: '19:00',
    };
    render(<SleepEntryForm date="2026-07-28" initialEntry={initialEntry} onSubmit={() => {}} />);

    expect(screen.getByLabelText('자려고 누운 시간')).toHaveValue('23:00');
    expect(screen.getByText('피곤함')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('머리아픔')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('음주 여부')).toBeChecked();
    expect(screen.getByText('맥주')).toHaveAttribute('aria-pressed', 'true');
  });
});
