import {
  resolveSequentialMinutes,
  calculateEstimatedSleepMinutes,
  calculateRestlessMinutes,
  formatMinutesAsDuration,
} from './sleepCalc';

describe('resolveSequentialMinutes', () => {
  it('keeps times on the same day when already increasing', () => {
    expect(resolveSequentialMinutes(['23:00', '23:30', '23:45'])).toEqual([1380, 1410, 1425]);
  });

  it('rolls a time forward by 24h once it appears to go backwards (midnight crossing)', () => {
    expect(resolveSequentialMinutes(['23:00', '23:30', '07:00'])).toEqual([1380, 1410, 1860]);
  });

  it('rolls forward multiple times in sequence when needed', () => {
    // bed 23:50, last screen just after midnight, wake next morning
    expect(resolveSequentialMinutes(['23:50', '00:10', '07:00'])).toEqual([1430, 1450, 1860]);
  });

  it('treats an equal consecutive time as zero elapsed minutes, not a rollover', () => {
    expect(resolveSequentialMinutes(['23:00', '23:00', '07:00'])).toEqual([1380, 1380, 1860]);
  });
});

describe('calculateEstimatedSleepMinutes', () => {
  it('uses wake time minus last-screen time, not bed time', () => {
    const entry = { bedTime: '23:00', lastScreenTime: '23:30', wakeTime: '07:00' };
    expect(calculateEstimatedSleepMinutes(entry)).toBe(450); // 7h30m
  });

  it('handles a last-screen time that crosses midnight', () => {
    const entry = { bedTime: '23:50', lastScreenTime: '00:10', wakeTime: '07:00' };
    expect(calculateEstimatedSleepMinutes(entry)).toBe(410); // 6h50m
  });
});

describe('calculateRestlessMinutes', () => {
  it('is the gap between lying down and the last screen check', () => {
    const entry = { bedTime: '23:00', lastScreenTime: '23:30', wakeTime: '07:00' };
    expect(calculateRestlessMinutes(entry)).toBe(30);
  });

  it('is zero when the last screen check happens right at bed time', () => {
    const entry = { bedTime: '23:00', lastScreenTime: '23:00', wakeTime: '07:00' };
    expect(calculateRestlessMinutes(entry)).toBe(0);
  });
});

describe('formatMinutesAsDuration', () => {
  it('formats whole hours without a minutes suffix', () => {
    expect(formatMinutesAsDuration(420)).toBe('7시간');
  });

  it('formats hours and minutes together', () => {
    expect(formatMinutesAsDuration(450)).toBe('7시간 30분');
  });

  it('formats less than an hour as just minutes', () => {
    expect(formatMinutesAsDuration(45)).toBe('0시간 45분');
  });
});
