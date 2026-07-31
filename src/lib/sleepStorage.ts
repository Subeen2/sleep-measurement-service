import { SleepEntry } from './sleepTypes';

const STORAGE_KEY = 'sleepDiary:entries';

function readAll(): Record<string, SleepEntry> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, SleepEntry>;
  } catch {
    return {};
  }
}

function writeAll(entries: Record<string, SleepEntry>): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function saveEntry(entry: SleepEntry): boolean {
  const all = readAll();
  all[entry.date] = entry;
  return writeAll(all);
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
