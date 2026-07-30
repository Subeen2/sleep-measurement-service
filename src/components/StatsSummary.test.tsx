import { render, screen } from '@testing-library/react';
import { StatsSummary } from './StatsSummary';

describe('StatsSummary', () => {
  it('shows the bucket label and metadata when a bucket is provided', () => {
    render(
      <StatsSummary
        title="가장 좋은 시간대"
        bucket={{ label: '22시~24시', averageScore: 1.5, sampleCount: 4 }}
        emptyMessage="데이터 부족"
      />
    );
    expect(screen.getByText('가장 좋은 시간대')).toBeInTheDocument();
    expect(screen.getByText('22시~24시')).toBeInTheDocument();
    expect(screen.getByText(/1\.5/)).toBeInTheDocument();
    expect(screen.getByText(/4개 기록/)).toBeInTheDocument();
  });

  it('shows the empty message when no bucket is available', () => {
    render(<StatsSummary title="가장 좋은 시간대" bucket={null} emptyMessage="데이터 부족" />);
    expect(screen.getByText('데이터 부족')).toBeInTheDocument();
  });
});
