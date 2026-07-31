import { useState } from 'react';
import { getLocalDateString } from '../lib/dateUtils';
import { getEntry, saveEntry } from '../lib/sleepStorage';
import { calculateEstimatedSleepMinutes, formatMinutesAsDuration } from '../lib/sleepCalc';
import { SleepEntry } from '../lib/sleepTypes';
import { SleepEntryForm } from '../components/SleepEntryForm';
import { PixelButton } from '../components/PixelButton';

export function TodayPage() {
  const today = getLocalDateString();
  const [entry, setEntry] = useState<SleepEntry | null>(() => getEntry(today));
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleSubmit(newEntry: SleepEntry) {
    const saved = saveEntry(newEntry);
    if (!saved) {
      setSaveError('저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    setSaveError(null);
    setEntry(newEntry);
    setEditing(false);
  }

  if (entry && !editing) {
    const minutes = calculateEstimatedSleepMinutes(entry);
    return (
      <div className="today-page">
        <p className="today-page__greeting">오늘도 기록 완료! 잘 잤나요? 🌙</p>
        <div className="word-card">
          <p>추정 수면 시간: {formatMinutesAsDuration(minutes)}</p>
          <p>기상 시간: {entry.wakeTime}</p>
        </div>
        <PixelButton onClick={() => setEditing(true)}>수정하기</PixelButton>
      </div>
    );
  }

  return (
    <div className="today-page">
      <p className="today-page__greeting">오늘 밤도 푹 쉬고, 내일 아침에 기록해줘요 🌙</p>
      {saveError && <p className="sleep-entry-form__error">{saveError}</p>}
      <SleepEntryForm date={today} initialEntry={entry ?? undefined} onSubmit={handleSubmit} />
    </div>
  );
}
