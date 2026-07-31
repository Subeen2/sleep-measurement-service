import { SleepEntry } from '../lib/sleepTypes';
import { calculateEstimatedSleepMinutes, calculateRestlessMinutes, formatMinutesAsDuration } from '../lib/sleepCalc';
import { OVERALL_CONDITION_LABEL, PHYSICAL_CONDITION_LABEL, ALCOHOL_LABEL } from '../lib/sleepLabels';

interface DayDetailCardProps {
  entry: SleepEntry;
}

export function DayDetailCard({ entry }: DayDetailCardProps) {
  const minutes = calculateEstimatedSleepMinutes(entry);
  return (
    <div className="word-card day-detail-card">
      <p className="day-detail-card__date">{entry.date}</p>
      <p>추정 수면 시간: {formatMinutesAsDuration(minutes)}</p>
      <p>뒤척인 시간: {formatMinutesAsDuration(calculateRestlessMinutes(entry))}</p>
      <p>
        취침: {entry.bedTime} · 마지막 화면: {entry.lastScreenTime} · 기상: {entry.wakeTime}
      </p>
      <p>
        컨디션: {OVERALL_CONDITION_LABEL[entry.overallCondition]} / {PHYSICAL_CONDITION_LABEL[entry.physicalCondition]}
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
