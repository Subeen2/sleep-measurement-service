import { useState } from 'react';
import { CalendarView } from '../components/CalendarView';
import { DayDetailCard } from '../components/DayDetailCard';
import { PixelButton } from '../components/PixelButton';
import { getAllEntries, getEntry } from '../lib/sleepStorage';

export function HistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entries = getAllEntries();
  const selectedEntry = selectedDate ? getEntry(selectedDate) : null;

  function goToPreviousMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  }

  return (
    <div className="history-page">
      <div className="history-page__nav">
        <PixelButton onClick={goToPreviousMonth}>◀</PixelButton>
        <span>
          {year}년 {month}월
        </span>
        <PixelButton onClick={goToNextMonth}>▶</PixelButton>
      </div>
      <CalendarView
        year={year}
        month={month}
        entries={entries}
        selectedDate={selectedDate ?? undefined}
        onSelectDate={setSelectedDate}
      />
      {selectedEntry && <DayDetailCard entry={selectedEntry} />}
    </div>
  );
}
