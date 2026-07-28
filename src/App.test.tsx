import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('잠순이 잠돌이 일기장')).toBeInTheDocument();
  });
});
