import { getAllEntries } from '../lib/sleepStorage';
import { bestSleepOnsetBucket, bestSleepDurationBucket } from '../lib/sleepStats';
import { StatsSummary } from '../components/StatsSummary';

export function StatsPage() {
  const entries = getAllEntries();

  if (entries.length === 0) {
    return <p className="stats-page__empty">아직 기록이 없어요. 며칠 기록을 쌓으면 통계를 보여줄게요 📊</p>;
  }

  return (
    <div className="stats-page">
      <StatsSummary
        title="가장 컨디션이 좋았던 잠든 시간대"
        bucket={bestSleepOnsetBucket(entries)}
        emptyMessage="아직 데이터가 부족해요"
      />
      <StatsSummary
        title="가장 컨디션이 좋았던 수면 시간"
        bucket={bestSleepDurationBucket(entries)}
        emptyMessage="아직 데이터가 부족해요"
      />
    </div>
  );
}
