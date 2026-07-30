import { getDaysInMonth, getFirstWeekdayOfMonth } from '../lib/dateUtils';
import { SleepEntry } from '../lib/sleepTypes';

interface CalendarViewProps {
  year: number;
  month: number; // 1-12
  entries: SleepEntry[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

const CONDITION_ICON: Record<SleepEntry['overallCondition'], string> = {
  tired: '😪',
  better_than_usual: '🙂',
  refreshed: '😊',
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarView({ year, month, entries, selectedDate, onSelectDate }: CalendarViewProps) {
  const entryByDate = new Map(entries.map((e) => [e.date, e]));
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="calendar-view">
      <div className="calendar-view__weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="calendar-view__grid">
        {cells.map((day, idx) => {
          if (day === null) return <span key={`blank-${idx}`} />;
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEntry = entryByDate.get(date);
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              className={['calendar-view__day', isSelected ? 'calendar-view__day--selected' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(date)}
            >
              <span>{day}</span>
              {dayEntry && <span className="calendar-view__icon">{CONDITION_ICON[dayEntry.overallCondition]}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
