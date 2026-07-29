// src/lib/dateUtils.test.ts
import { getLocalDateString, addDays, getDaysInMonth, getFirstWeekdayOfMonth } from './dateUtils';

describe('getLocalDateString', () => {
  it('formats a date as YYYY-MM-DD with zero-padded month and day', () => {
    expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getLocalDateString(new Date(2026, 10, 23))).toBe('2026-11-23');
  });
});

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-07-20', 3)).toBe('2026-07-23');
  });

  it('rolls over into the next month', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02');
  });

  it('rolls over into the next year', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('supports negative offsets', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for July', () => {
    expect(getDaysInMonth(2026, 7)).toBe(31);
  });

  it('returns 28 for a non-leap February', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28);
  });

  it('returns 29 for a leap February', () => {
    expect(getDaysInMonth(2028, 2)).toBe(29);
  });
});

describe('getFirstWeekdayOfMonth', () => {
  it('returns the JS Date weekday (0=Sun) of the 1st of the month', () => {
    // 2026-07-01 is a Wednesday
    expect(getFirstWeekdayOfMonth(2026, 7)).toBe(3);
  });
});
