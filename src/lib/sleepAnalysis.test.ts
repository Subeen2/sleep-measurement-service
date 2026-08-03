import {
  getRecentEntriesForAnalysis,
  hasEnoughDataForAnalysis,
  isAnalysisFeatureEnabled,
  getCachedAnalysis,
  saveCachedAnalysis,
  requestSleepAnalysis,
  CachedAnalysis,
} from './sleepAnalysis';
import * as sleepStorage from './sleepStorage';
import { SleepEntry } from './sleepTypes';

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

beforeEach(() => {
  localStorage.clear();
});

describe('getRecentEntriesForAnalysis', () => {
  it('includes entries from exactly 13 days before the reference date through the reference date', () => {
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([
      makeEntry('2026-07-20'), // 14 days before -> excluded
      makeEntry('2026-07-21'), // exactly 13 days before -> included
      makeEntry('2026-08-03'), // reference date itself -> included
    ]);
    const result = getRecentEntriesForAnalysis('2026-08-03');
    expect(result.map((e) => e.date)).toEqual(['2026-07-21', '2026-08-03']);
  });

  it('excludes dates after the reference date', () => {
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([makeEntry('2026-08-03'), makeEntry('2026-08-04')]);
    const result = getRecentEntriesForAnalysis('2026-08-03');
    expect(result.map((e) => e.date)).toEqual(['2026-08-03']);
  });
});

describe('hasEnoughDataForAnalysis', () => {
  it('requires at least 3 entries', () => {
    expect(hasEnoughDataForAnalysis([makeEntry('2026-08-01'), makeEntry('2026-08-02')])).toBe(false);
    expect(
      hasEnoughDataForAnalysis([makeEntry('2026-08-01'), makeEntry('2026-08-02'), makeEntry('2026-08-03')])
    ).toBe(true);
  });
});

describe('isAnalysisFeatureEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when the worker URL is not set', () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', '');
    expect(isAnalysisFeatureEnabled()).toBe(false);
  });

  it('is true when the worker URL is set', () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', 'https://example.workers.dev');
    expect(isAnalysisFeatureEnabled()).toBe(true);
  });
});

describe('cached analysis', () => {
  it('returns null when nothing is cached', () => {
    expect(getCachedAnalysis()).toBeNull();
  });

  it('saves and retrieves a cached analysis', () => {
    const analysis: CachedAnalysis = {
      text: '분석 결과입니다',
      generatedAt: '2026-08-03T09:00:00.000Z',
      entryDatesUsed: ['2026-08-01', '2026-08-02', '2026-08-03'],
    };
    expect(saveCachedAnalysis(analysis)).toBe(true);
    expect(getCachedAnalysis()).toEqual(analysis);
  });

  it('falls back to null when the cached JSON is corrupted', () => {
    localStorage.setItem('sleepDiary:aiAnalysis', 'not json');
    expect(getCachedAnalysis()).toBeNull();
  });
});

describe('requestSleepAnalysis', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('throws a friendly error when the worker URL is not configured', async () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', '');
    await expect(requestSleepAnalysis([makeEntry('2026-08-01')])).rejects.toThrow();
  });

  it('returns the analysis text on success', async () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', 'https://example.workers.dev');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('분석 결과 텍스트'),
    }) as unknown as typeof fetch;

    const result = await requestSleepAnalysis([makeEntry('2026-08-01')]);

    expect(result).toBe('분석 결과 텍스트');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.workers.dev',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the response is not ok', async () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', 'https://example.workers.dev');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await expect(requestSleepAnalysis([makeEntry('2026-08-01')])).rejects.toThrow();
  });
});
