import { useState } from 'react';
import { TodayPage } from './pages/TodayPage';
import { HistoryPage } from './pages/HistoryPage';
import { StatsPage } from './pages/StatsPage';
import { PixelButton } from './components/PixelButton';
import { PullToRefresh } from './components/PullToRefresh';
import { requestNotificationPermissionAndSync } from './lib/reminder';

type Tab = 'today' | 'history' | 'stats';

export function App() {
  const [tab, setTab] = useState<Tab>('today');

  return (
    <PullToRefresh>
      <div className="app">
        <h1>잠순이 잠돌이 일기장</h1>
        <nav className="tab-bar">
          <PixelButton onClick={() => setTab('today')} aria-pressed={tab === 'today'}>
            기록
          </PixelButton>
          <PixelButton onClick={() => setTab('history')} aria-pressed={tab === 'history'}>
            달력
          </PixelButton>
          <PixelButton onClick={() => setTab('stats')} aria-pressed={tab === 'stats'}>
            통계
          </PixelButton>
          <PixelButton onClick={() => requestNotificationPermissionAndSync()}>🔔 알림 켜기</PixelButton>
        </nav>
        {tab === 'today' && <TodayPage />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'stats' && <StatsPage />}
      </div>
    </PullToRefresh>
  );
}
