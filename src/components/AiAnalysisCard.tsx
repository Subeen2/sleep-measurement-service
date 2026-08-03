import { useState } from 'react';
import { PixelButton } from './PixelButton';
import {
  getRecentEntriesForAnalysis,
  hasEnoughDataForAnalysis,
  isAnalysisFeatureEnabled,
  getCachedAnalysis,
  saveCachedAnalysis,
  requestSleepAnalysis,
} from '../lib/sleepAnalysis';

type State =
  | { status: 'idle'; cachedText: string | null }
  | { status: 'loading'; cachedText: string | null }
  | { status: 'error'; message: string; cachedText: string | null };

export function AiAnalysisCard() {
  const [state, setState] = useState<State>(() => ({
    status: 'idle',
    cachedText: getCachedAnalysis()?.text ?? null,
  }));

  if (!isAnalysisFeatureEnabled()) return null;

  const entries = getRecentEntriesForAnalysis();

  if (!hasEnoughDataForAnalysis(entries)) {
    return (
      <div className="word-card ai-analysis-card">
        <p>아직 분석할 데이터가 부족해요. 3일 이상 기록해보면 AI가 패턴을 찾아드려요 🔍</p>
      </div>
    );
  }

  async function handleAnalyze() {
    setState((prev) => ({ status: 'loading', cachedText: prev.cachedText }));
    try {
      const text = await requestSleepAnalysis(entries);
      saveCachedAnalysis({
        text,
        generatedAt: new Date().toISOString(),
        entryDatesUsed: entries.map((e) => e.date),
      });
      setState({ status: 'idle', cachedText: text });
    } catch {
      setState((prev) => ({
        status: 'error',
        message: '지금은 분석을 받아올 수 없어요, 잠시 후 다시 시도해주세요',
        cachedText: prev.cachedText,
      }));
    }
  }

  return (
    <div className="word-card ai-analysis-card">
      <h3>🤖 AI 수면 분석</h3>
      {state.cachedText && <p className="ai-analysis-card__result">{state.cachedText}</p>}
      {state.status === 'error' && <p className="ai-analysis-card__error">{state.message}</p>}
      <PixelButton onClick={handleAnalyze} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? '분석 중이에요...' : state.cachedText ? '🔄 다시 분석받기' : '🤖 AI로 분석받기'}
      </PixelButton>
      <p className="ai-analysis-card__notice">최근 14일 기록이 OpenAI로 전송되어 분석됩니다</p>
    </div>
  );
}
