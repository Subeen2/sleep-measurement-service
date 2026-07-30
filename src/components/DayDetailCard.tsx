import { SleepEntry } from '../lib/sleepTypes';
import { calculateEstimatedSleepMinutes, formatMinutesAsDuration } from '../lib/sleepCalc';

const OVERALL_LABEL: Record<SleepEntry['overallCondition'], string> = {
  tired: '피곤함',
  better_than_usual: '평소보다 개운함',
  refreshed: '개운함',
};

const PHYSICAL_LABEL: Record<SleepEntry['physicalCondition'], string> = {
  headache: '머리아픔',
  groggy: '멍함',
  none: '안아픔',
};

const ALCOHOL_LABEL: Record<NonNullable<SleepEntry['alcoholType']>, string> = {
  beer: '맥주',
  wine: '와인',
  soju: '소주',
  spirits: '양주',
  other: '기타',
};

interface DayDetailCardProps {
  entry: SleepEntry;
}

export function DayDetailCard({ entry }: DayDetailCardProps) {
  const minutes = calculateEstimatedSleepMinutes(entry);
  return (
    <div className="word-card day-detail-card">
      <p className="day-detail-card__date">{entry.date}</p>
      <p>추정 수면 시간: {formatMinutesAsDuration(minutes)}</p>
      <p>
        취침: {entry.bedTime} · 마지막 화면: {entry.lastScreenTime} · 기상: {entry.wakeTime}
      </p>
      <p>
        컨디션: {OVERALL_LABEL[entry.overallCondition]} / {PHYSICAL_LABEL[entry.physicalCondition]}
      </p>
      {entry.caffeineShots > 0 && (
        <p>
          카페인: {entry.caffeineShots}샷{entry.caffeineTime ? ` (${entry.caffeineTime})` : ''}
        </p>
      )}
      {entry.hadAlcohol && <p>음주: {entry.alcoholType ? ALCOHOL_LABEL[entry.alcoholType] : '기록 없음'}</p>}
      {entry.lastMealTime && <p>마지막 식사: {entry.lastMealTime}</p>}
    </div>
  );
}
