import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiAnalysisCard } from './AiAnalysisCard';
import * as sleepAnalysis from '../lib/sleepAnalysis';
import { SleepEntry } from '../lib/sleepTypes';

function makeEntry(date: string): SleepEntry {
  return {
    date,
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition: 'refreshed',
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
  };
}

const THREE_ENTRIES = [makeEntry('2026-08-01'), makeEntry('2026-08-02'), makeEntry('2026-08-03')];

beforeEach(() => {
  vi.spyOn(sleepAnalysis, 'isAnalysisFeatureEnabled').mockReturnValue(true);
});

describe('AiAnalysisCard', () => {
  it('renders nothing when the feature is not configured', () => {
    vi.spyOn(sleepAnalysis, 'isAnalysisFeatureEnabled').mockReturnValue(false);
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    const getCachedSpy = vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);

    const { container } = render(<AiAnalysisCard />);

    expect(container).toBeEmptyDOMElement();
    expect(getCachedSpy).not.toHaveBeenCalled();
  });

  it('shows a friendly message with no button when there is not enough data', () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue([makeEntry('2026-08-03')]);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(false);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);

    render(<AiAnalysisCard />);

    expect(screen.getByText(/아직 분석할 데이터가 부족해요/)).toBeInTheDocument();
    expect(screen.queryByText(/AI로 분석받기/)).not.toBeInTheDocument();
  });

  it('shows the analyze button and privacy notice when there is no cached result', () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);

    render(<AiAnalysisCard />);

    expect(screen.getByText('🤖 AI로 분석받기')).toBeInTheDocument();
    expect(screen.getByText(/OpenAI로 전송되어 분석됩니다/)).toBeInTheDocument();
  });

  it('shows the cached result immediately and a "다시 분석받기" button', () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue({
      text: '이전 분석 결과',
      generatedAt: '2026-08-01T00:00:00.000Z',
      entryDatesUsed: ['2026-08-01'],
    });

    render(<AiAnalysisCard />);

    expect(screen.getByText('이전 분석 결과')).toBeInTheDocument();
    expect(screen.getByText('🔄 다시 분석받기')).toBeInTheDocument();
  });

  it('requests a new analysis on click, shows loading, then the result, and caches it', async () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);
    let resolveRequest!: (text: string) => void;
    vi.spyOn(sleepAnalysis, 'requestSleepAnalysis').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    const saveSpy = vi.spyOn(sleepAnalysis, 'saveCachedAnalysis').mockReturnValue(true);

    render(<AiAnalysisCard />);
    await userEvent.click(screen.getByText('🤖 AI로 분석받기'));

    expect(screen.getByText('분석 중이에요...')).toBeInTheDocument();

    resolveRequest('새로운 분석 결과');
    await screen.findByText('새로운 분석 결과');

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '새로운 분석 결과',
        entryDatesUsed: ['2026-08-01', '2026-08-02', '2026-08-03'],
      })
    );
  });

  it('shows an error message and keeps the previous cached result on failure', async () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue({
      text: '이전 분석 결과',
      generatedAt: '2026-08-01T00:00:00.000Z',
      entryDatesUsed: ['2026-08-01'],
    });
    vi.spyOn(sleepAnalysis, 'requestSleepAnalysis').mockRejectedValue(new Error('network error'));

    render(<AiAnalysisCard />);
    await userEvent.click(screen.getByText('🔄 다시 분석받기'));

    await screen.findByText(/지금은 분석을 받아올 수 없어요/);
    expect(screen.getByText('이전 분석 결과')).toBeInTheDocument();
  });
});
