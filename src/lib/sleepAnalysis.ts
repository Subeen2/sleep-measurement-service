import { SleepEntry } from './sleepTypes';
import { getAllEntries } from './sleepStorage';
import { getLocalDateString, addDays } from './dateUtils';

const CACHE_KEY = 'sleepDiary:aiAnalysis';
const ANALYSIS_WINDOW_DAYS = 14;
const MIN_ENTRIES_REQUIRED = 3;

export interface CachedAnalysis {
  text: string;
  generatedAt: string; // ISO datetime
  entryDatesUsed: string[];
}

export function getRecentEntriesForAnalysis(referenceDate: string = getLocalDateString()): SleepEntry[] {
  const cutoff = addDays(referenceDate, -(ANALYSIS_WINDOW_DAYS - 1));
  return getAllEntries().filter((entry) => entry.date >= cutoff && entry.date <= referenceDate);
}

export function hasEnoughDataForAnalysis(entries: SleepEntry[]): boolean {
  return entries.length >= MIN_ENTRIES_REQUIRED;
}

export function isAnalysisFeatureEnabled(): boolean {
  return Boolean(import.meta.env.VITE_SLEEP_ANALYSIS_WORKER_URL);
}

export function getCachedAnalysis(): CachedAnalysis | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAnalysis;
  } catch {
    return null;
  }
}

export function saveCachedAnalysis(analysis: CachedAnalysis): boolean {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(analysis));
    return true;
  } catch {
    return false;
  }
}

export async function requestSleepAnalysis(entries: SleepEntry[]): Promise<string> {
  const workerUrl = import.meta.env.VITE_SLEEP_ANALYSIS_WORKER_URL;
  if (!workerUrl) {
    throw new Error('AI 분석 기능이 설정되지 않았어요');
  }
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    throw new Error(`분석 요청 실패: ${res.status}`);
  }
  return res.text();
}
