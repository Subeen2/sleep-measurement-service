import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PixelRadioGroup } from './PixelRadioGroup';

type Choice = 'a' | 'b' | 'c';
const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'a', label: '옵션 A' },
  { value: 'b', label: '옵션 B' },
  { value: 'c', label: '옵션 C' },
];

describe('PixelRadioGroup', () => {
  it('renders the legend and all options', () => {
    render(<PixelRadioGroup legend="선택하세요" options={OPTIONS} value={undefined} onChange={() => {}} />);
    expect(screen.getByText('선택하세요')).toBeInTheDocument();
    expect(screen.getByText('옵션 A')).toBeInTheDocument();
    expect(screen.getByText('옵션 B')).toBeInTheDocument();
    expect(screen.getByText('옵션 C')).toBeInTheDocument();
  });

  it('marks the selected option as pressed', () => {
    render(<PixelRadioGroup legend="선택하세요" options={OPTIONS} value="b" onChange={() => {}} />);
    expect(screen.getByText('옵션 A')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('옵션 B')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn();
    render(<PixelRadioGroup legend="선택하세요" options={OPTIONS} value={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByText('옵션 C'));
    expect(onChange).toHaveBeenCalledWith('c');
  });
});
