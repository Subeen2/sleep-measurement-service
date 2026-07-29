import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PixelButton } from './PixelButton';

describe('PixelButton', () => {
  it('renders children and applies the pixel-button class', () => {
    render(<PixelButton>눌러줘</PixelButton>);
    const button = screen.getByText('눌러줘');
    expect(button).toHaveClass('pixel-button');
  });

  it('merges a custom className with the base class', () => {
    render(<PixelButton className="extra">눌러줘</PixelButton>);
    expect(screen.getByText('눌러줘')).toHaveClass('pixel-button', 'extra');
  });

  it('forwards click handlers and native button props', async () => {
    const onClick = vi.fn();
    render(
      <PixelButton onClick={onClick} disabled>
        눌러줘
      </PixelButton>
    );
    expect(screen.getByText('눌러줘')).toBeDisabled();
  });
});
