import { SleepEntry } from './sleepTypes';

const STORAGE_KEY = 'sleepDiary:entries';

function readAll(): Record<string, SleepEntry> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, SleepEntry>;
  } catch {
    return {};
  }
}

function writeAll(entries: Record<string, SleepEntry>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveEntry(entry: SleepEntry): void {
  const all = readAll();
  all[entry.date] = entry;
  writeAll(all);
}

export function getEntry(date: string): SleepEntry | null {
  const all = readAll();
  return all[date] ?? null;
}

export function getAllEntries(): SleepEntry[] {
  return Object.values(readAll()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function deleteEntry(date: string): void {
  const all = readAll();
  delete all[date];
  writeAll(all);
}
