import { BucketStat } from '../lib/sleepStats';

interface StatsSummaryProps {
  title: string;
  bucket: BucketStat | null;
  emptyMessage: string;
}

export function StatsSummary({ title, bucket, emptyMessage }: StatsSummaryProps) {
  return (
    <div className="word-card stats-summary">
      <h3>{title}</h3>
      {bucket ? (
        <>
          <p className="stats-summary__value">{bucket.label}</p>
          <p className="stats-summary__meta">
            평균 컨디션 점수 {bucket.averageScore.toFixed(1)} · {bucket.sampleCount}개 기록 기반
          </p>
        </>
      ) : (
        <p className="stats-summary__empty">{emptyMessage}</p>
      )}
    </div>
  );
}
