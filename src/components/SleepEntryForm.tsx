import { FormEvent, useState } from 'react';
import { AlcoholType, OverallCondition, PhysicalCondition, SleepEntry } from '../lib/sleepTypes';
import { OVERALL_CONDITION_OPTIONS, PHYSICAL_CONDITION_OPTIONS, ALCOHOL_OPTIONS } from '../lib/sleepLabels';
import { PixelRadioGroup } from './PixelRadioGroup';
import { PixelButton } from './PixelButton';

interface SleepEntryFormProps {
  date: string;
  initialEntry?: SleepEntry;
  onSubmit: (entry: SleepEntry) => void;
}

export function SleepEntryForm({ date, initialEntry, onSubmit }: SleepEntryFormProps) {
  const [bedTime, setBedTime] = useState(initialEntry?.bedTime ?? '');
  const [lastScreenTime, setLastScreenTime] = useState(initialEntry?.lastScreenTime ?? '');
  const [wakeTime, setWakeTime] = useState(initialEntry?.wakeTime ?? '');
  const [overallCondition, setOverallCondition] = useState<OverallCondition | undefined>(
    initialEntry?.overallCondition
  );
  const [physicalCondition, setPhysicalCondition] = useState<PhysicalCondition | undefined>(
    initialEntry?.physicalCondition
  );
  const [caffeineShots, setCaffeineShots] = useState(initialEntry?.caffeineShots ?? 0);
  const [caffeineTime, setCaffeineTime] = useState(initialEntry?.caffeineTime ?? '');
  const [hadAlcohol, setHadAlcohol] = useState(initialEntry?.hadAlcohol ?? false);
  const [alcoholType, setAlcoholType] = useState<AlcoholType | undefined>(initialEntry?.alcoholType);
  const [lastMealTime, setLastMealTime] = useState(initialEntry?.lastMealTime ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bedTime || !lastScreenTime || !wakeTime || !overallCondition || !physicalCondition) {
      setError('취침 시간, 마지막으로 본 시간, 기상 시간, 컨디션은 필수예요');
      return;
    }
    setError(null);
    onSubmit({
      date,
      bedTime,
      lastScreenTime,
      wakeTime,
      overallCondition,
      physicalCondition,
      caffeineShots,
      caffeineTime: caffeineShots > 0 ? caffeineTime || undefined : undefined,
      hadAlcohol,
      alcoholType: hadAlcohol ? alcoholType : undefined,
      lastMealTime: lastMealTime || undefined,
    });
  }

  return (
    <form className="sleep-entry-form" onSubmit={handleSubmit}>
      <label>
        자려고 누운 시간
        <input type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
      </label>
      <label>
        마지막으로 화면을 본 시간
        <input type="time" value={lastScreenTime} onChange={(e) => setLastScreenTime(e.target.value)} />
      </label>
      <label>
        기상 시간
        <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
      </label>

      <PixelRadioGroup
        legend="오늘 컨디션"
        options={OVERALL_CONDITION_OPTIONS}
        value={overallCondition}
        onChange={setOverallCondition}
      />
      <PixelRadioGroup
        legend="몸 상태"
        options={PHYSICAL_CONDITION_OPTIONS}
        value={physicalCondition}
        onChange={setPhysicalCondition}
      />

      <label>
        카페인 섭취량 (1샷 기준)
        <input
          type="number"
          min={0}
          value={caffeineShots}
          onChange={(e) => setCaffeineShots(Math.max(0, Number(e.target.value)))}
        />
      </label>
      {caffeineShots > 0 && (
        <label>
          카페인 섭취 시간 (선택)
          <input type="time" value={caffeineTime} onChange={(e) => setCaffeineTime(e.target.value)} />
        </label>
      )}

      <label>
        <input type="checkbox" checked={hadAlcohol} onChange={(e) => setHadAlcohol(e.target.checked)} />
        음주 여부
      </label>
      {hadAlcohol && (
        <PixelRadioGroup legend="주종" options={ALCOHOL_OPTIONS} value={alcoholType} onChange={setAlcoholType} />
      )}

      <label>
        마지막 식사 시간 (선택)
        <input type="time" value={lastMealTime} onChange={(e) => setLastMealTime(e.target.value)} />
      </label>

      {error && <p className="sleep-entry-form__error">{error}</p>}
      <PixelButton type="submit">기록하기</PixelButton>
    </form>
  );
}
