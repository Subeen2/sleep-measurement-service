import { saveEntry, getEntry, getAllEntries, deleteEntry } from './sleepStorage';
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

describe('sleepStorage', () => {
  it('returns null for a date with no saved entry', () => {
    expect(getEntry('2026-07-28')).toBeNull();
  });

  it('saves and retrieves an entry by date', () => {
    const entry = makeEntry('2026-07-28');
    saveEntry(entry);
    expect(getEntry('2026-07-28')).toEqual(entry);
  });

  it('overwrites an existing entry for the same date', () => {
    saveEntry(makeEntry('2026-07-28'));
    const updated = { ...makeEntry('2026-07-28'), overallCondition: 'tired' as const };
    saveEntry(updated);
    expect(getEntry('2026-07-28')).toEqual(updated);
  });

  it('lists all entries sorted by date, newest first', () => {
    saveEntry(makeEntry('2026-07-26'));
    saveEntry(makeEntry('2026-07-28'));
    saveEntry(makeEntry('2026-07-27'));
    expect(getAllEntries().map((e) => e.date)).toEqual(['2026-07-28', '2026-07-27', '2026-07-26']);
  });

  it('returns an empty array when nothing has been saved', () => {
    expect(getAllEntries()).toEqual([]);
  });

  it('deletes an entry by date', () => {
    saveEntry(makeEntry('2026-07-28'));
    deleteEntry('2026-07-28');
    expect(getEntry('2026-07-28')).toBeNull();
  });

  it('falls back to an empty store when stored JSON is corrupted', () => {
    localStorage.setItem('sleepDiary:entries', 'not valid json');
    expect(getAllEntries()).toEqual([]);
  });
});
