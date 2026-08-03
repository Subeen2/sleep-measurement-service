# AI 수면 분석 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-demand, personalized "AI 수면 분석" card to the 통계 (Stats) tab that sends the user's last 14 days of sleep entries to OpenAI (via a Cloudflare Worker proxy that keeps the API key secret) and shows a short Korean analysis with concrete patterns and suggestions.

**Architecture:** The existing app (`C:/SUBEEN/in_my_dreams`) stays a fully static, server-less React/Vite PWA on GitHub Pages. A new, independently-deployed Cloudflare Worker (`worker/sleep-analysis/`, versioned in this same repo but built/deployed separately from the Vite app) is the only thing that ever holds the OpenAI API key. The client posts a JSON array of recent `SleepEntry` objects to the Worker's URL (read from a build-time env var); the Worker validates the request's `Origin`, summarizes the entries into a compact Korean text block, calls OpenAI's Chat Completions API, and returns the plain-text analysis. The client caches the last result in `localStorage` so revisiting the tab doesn't force a re-call.

**Tech Stack:** Existing app: React 18.3, TypeScript 5.5, Vite 5.4, Vitest + RTL (unchanged). New for the Worker: Cloudflare Workers + Wrangler CLI, TypeScript, OpenAI Chat Completions API (`gpt-4o-mini`).

## Global Constraints

- The Worker must never expose `OPENAI_API_KEY` to the client — it is set only via `wrangler secret put OPENAI_API_KEY` (production) or a git-ignored `.dev.vars` file (local dev), never committed, never returned in any response.
- The Worker only accepts requests from an allow-list of two origins: `https://subeen2.github.io` (production) and `http://localhost:5173` (local dev). Any other `Origin` gets `403`.
- The client feature must **gracefully disable itself** (render nothing, no error) when `VITE_SLEEP_ANALYSIS_WORKER_URL` is unset — this keeps local dev and any fork working without a deployed Worker.
- Analysis scope is exactly the **last 14 days including today** (`addDays(today, -13)` through `today`), never the full history.
- The AI card requires **at least 3 entries** in that 14-day window before showing the analyze button; otherwise it shows a friendly "아직 분석할 데이터가 부족해요" message with no button.
- A failed analysis request must show a fixed Korean error message and must **not** clear any previously cached (successful) result.
- Reuse the existing `SleepEntry` type (`src/lib/sleepTypes.ts`) and the existing Korean label maps (`src/lib/sleepLabels.ts`) from the Worker via relative import rather than redefining them — the Worker is part of this same repo and can reach `../../../src/lib/...` from `worker/sleep-analysis/src/`.
- No automated test framework is added for the Worker itself (YAGNI — it's a thin proxy with no business logic beyond request validation and prompt assembly). Verification is a scripted local `wrangler dev` + `curl` session, run and its output captured as part of Task 1.
- Pixel-art design system conventions apply to all new UI: `word-card` container class, `Galmuri11` font (inherited from `body`), `PixelButton` for the action button, hard (non-blurred) shadows — no new visual language introduced.
- Package versions for the new Worker toolchain: `wrangler@^3.78.0`, `@cloudflare/workers-types@^4.20240821.0`, `typescript@^5.5.4` (matches the app's existing TypeScript version).

---

## File Structure

```
in_my_dreams/
├── .env.example                          (modify — document VITE_SLEEP_ANALYSIS_WORKER_URL)
├── .gitignore                            (modify — add .env, .dev.vars)
├── .github/workflows/deploy.yml          (modify — pass VITE_SLEEP_ANALYSIS_WORKER_URL through to the build)
├── README.md                             (modify — add Worker deployment section)
├── worker/
│   └── sleep-analysis/
│       ├── package.json                  (create)
│       ├── tsconfig.json                 (create)
│       ├── wrangler.toml                 (create)
│       ├── .gitignore                    (create — ignores node_modules, .wrangler, .dev.vars locally too)
│       └── src/
│           └── index.ts                  (create — Worker entry point)
└── src/
    ├── styles/theme.css                  (modify — .ai-analysis-card styles)
    ├── lib/
    │   ├── sleepAnalysis.ts              (create)
    │   └── sleepAnalysis.test.ts         (create)
    ├── components/
    │   ├── AiAnalysisCard.tsx            (create)
    │   └── AiAnalysisCard.test.tsx       (create)
    └── pages/
        └── StatsPage.tsx                 (modify — render <AiAnalysisCard /> after the two StatsSummary cards)
```

---

### Task 1: Cloudflare Worker — sleep analysis proxy

**Files:**
- Create: `worker/sleep-analysis/package.json`
- Create: `worker/sleep-analysis/tsconfig.json`
- Create: `worker/sleep-analysis/wrangler.toml`
- Create: `worker/sleep-analysis/.gitignore`
- Create: `worker/sleep-analysis/src/index.ts`

**Interfaces:**
- Consumes: `SleepEntry` from `../../../src/lib/sleepTypes.ts`; `OVERALL_CONDITION_LABEL`, `PHYSICAL_CONDITION_LABEL`, `ALCOHOL_LABEL` from `../../../src/lib/sleepLabels.ts` (both already exist in this repo, unchanged).
- Produces: an HTTP endpoint. `POST <worker-url>` with body `{ "entries": SleepEntry[] }` → `200` with `text/plain` body (the analysis) on success, `403` for disallowed origins, `400` for a malformed/empty request, `405` for non-POST, `502` if the OpenAI call fails. This URL is consumed by Task 2's `requestSleepAnalysis()`.

- [ ] **Step 1: Create `worker/sleep-analysis/package.json`**

```json
{
  "name": "sleep-analysis-worker",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240821.0",
    "typescript": "^5.5.4",
    "wrangler": "^3.78.0"
  }
}
```

- [ ] **Step 2: Create `worker/sleep-analysis/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021"],
    "module": "ES2022",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "../../src/lib/sleepTypes.ts", "../../src/lib/sleepLabels.ts"]
}
```

- [ ] **Step 3: Create `worker/sleep-analysis/wrangler.toml`**

```toml
name = "sleep-analysis"
main = "src/index.ts"
compatibility_date = "2026-08-01"
```

- [ ] **Step 4: Create `worker/sleep-analysis/.gitignore`**

```
node_modules
.wrangler
.dev.vars
```

- [ ] **Step 5: Implement `worker/sleep-analysis/src/index.ts`**

```ts
import { SleepEntry } from '../../../src/lib/sleepTypes';
import { OVERALL_CONDITION_LABEL, PHYSICAL_CONDITION_LABEL, ALCOHOL_LABEL } from '../../../src/lib/sleepLabels';

export interface Env {
  OPENAI_API_KEY: string;
}

const ALLOWED_ORIGINS = new Set(['https://subeen2.github.io', 'http://localhost:5173']);

const SYSTEM_PROMPT =
  '너는 수면 과학에 밝은 친근한 톤의 어시스턴트야. 사용자가 기록한 실제 수면 데이터를 보고, ' +
  '한국어 존댓말로 4~6문장 이내의 분석을 작성해. 반드시 데이터에서 뽑아낼 수 있는 구체적인 상관관계를 ' +
  '1~2개 짚어내고 (예: 특정 요일, 카페인 섭취 시간, 화면을 끈 시간과 컨디션의 관계), 실천 가능한 제안을 ' +
  '1~2개 제시해. 이모지는 최소한만 사용하고, 과장되거나 의학적 진단처럼 들리는 표현은 피해.';

function summarizeEntry(entry: SleepEntry): string {
  const parts = [
    `${entry.date}: 취침 ${entry.bedTime}, 화면 끔 ${entry.lastScreenTime}, 기상 ${entry.wakeTime}`,
    `컨디션 ${OVERALL_CONDITION_LABEL[entry.overallCondition]}/${PHYSICAL_CONDITION_LABEL[entry.physicalCondition]}`,
  ];
  if (entry.caffeineShots > 0) {
    parts.push(`카페인 ${entry.caffeineShots}샷${entry.caffeineTime ? `(${entry.caffeineTime})` : ''}`);
  }
  if (entry.hadAlcohol) {
    parts.push(`음주${entry.alcoholType ? ` (${ALCOHOL_LABEL[entry.alcoholType]})` : ''}`);
  }
  if (entry.lastMealTime) {
    parts.push(`마지막 식사 ${entry.lastMealTime}`);
  }
  return parts.join(', ');
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const originAllowed = origin !== null && ALLOWED_ORIGINS.has(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: originAllowed ? corsHeaders(origin!) : {} });
    }

    if (!originAllowed) {
      return new Response('Forbidden', { status: 403 });
    }

    const headers = corsHeaders(origin!);

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers });
    }

    let body: { entries?: SleepEntry[] };
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers });
    }

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return new Response('entries is required', { status: 400, headers });
    }

    const summary = body.entries.map(summarizeEntry).join('\n');

    let openaiRes: Response;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: summary },
          ],
          temperature: 0.7,
        }),
      });
    } catch {
      return new Response('OpenAI request failed', { status: 502, headers });
    }

    if (!openaiRes.ok) {
      return new Response('OpenAI request failed', { status: 502, headers });
    }

    const data = (await openaiRes.json()) as { choices: { message: { content: string } }[] };
    const text = data.choices[0]?.message?.content?.trim() ?? '';

    return new Response(text, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
```

- [ ] **Step 6: Install dependencies and typecheck**

Run:
```bash
cd worker/sleep-analysis
npm install
npm run typecheck
```
Expected: `npm install` succeeds; `npm run typecheck` (`tsc --noEmit`) reports no errors. If it errors on resolving `../../../src/lib/sleepTypes`, double-check the `include` path in `tsconfig.json` (Step 2) is relative to `worker/sleep-analysis/`, i.e. `../../src/lib/...` from that directory reaches the repo-root `src/lib/...` — the import statement inside `index.ts` uses `../../../` because it's one level deeper (inside `src/`), while the tsconfig `include` paths are relative to `worker/sleep-analysis/` itself (two levels up), which is why the two path depths differ. This is correct as written above — just verify it compiles.

- [ ] **Step 7: Local verification with `wrangler dev` + `curl`**

Create a git-ignored local secrets file for testing (this file must NOT be committed — it's already covered by Step 4's `.gitignore`):

```bash
cd worker/sleep-analysis
echo 'OPENAI_API_KEY=dummy-key-for-local-testing' > .dev.vars
```

Start the dev server in the background:
```bash
npm run dev &
sleep 3
```

Run these four checks (adjust the port if wrangler prints a different one — check its startup output, default is 8787):

```bash
# 1. Preflight from the allowed local origin -> 204 with CORS header
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS http://localhost:8787 -H "Origin: http://localhost:5173"
# Expected: 204

# 2. Disallowed origin -> 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787 -H "Origin: https://evil.example.com" -H "Content-Type: application/json" -d '{"entries":[]}'
# Expected: 403

# 3. Allowed origin, empty entries -> 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787 -H "Origin: http://localhost:5173" -H "Content-Type: application/json" -d '{"entries":[]}'
# Expected: 400

# 4. Allowed origin, valid entry, dummy API key -> 502 (OpenAI rejects the dummy key, which proves the request reached OpenAI and the error path works; this is expected without a real key)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8787 -H "Origin: http://localhost:5173" -H "Content-Type: application/json" -d '{"entries":[{"date":"2026-08-01","bedTime":"23:00","lastScreenTime":"23:30","wakeTime":"07:00","overallCondition":"refreshed","physicalCondition":"none","caffeineShots":0,"hadAlcohol":false}]}'
# Expected: 502
```

Stop the dev server:
```bash
kill %1
```

If any status code doesn't match, fix `src/index.ts` before proceeding — do not skip this verification. If `wrangler dev` fails to start at all (e.g. sandbox network restrictions), report that clearly as a concern rather than guessing at the fix; the curl commands above are also valid for a human to run manually later.

- [ ] **Step 8: Commit**

```bash
git add worker/sleep-analysis
git commit -m "feat: add Cloudflare Worker proxy for AI sleep analysis"
```

---

### Task 2: Client sleep analysis library

**Files:**
- Create: `src/lib/sleepAnalysis.ts`
- Create: `src/lib/sleepAnalysis.test.ts`

**Interfaces:**
- Consumes: `SleepEntry` from `src/lib/sleepTypes.ts`; `getAllEntries` from `src/lib/sleepStorage.ts`; `getLocalDateString`, `addDays` from `src/lib/dateUtils.ts`.
- Produces:
  ```ts
  export interface CachedAnalysis {
    text: string;
    generatedAt: string; // ISO datetime
    entryDatesUsed: string[];
  }
  export function getRecentEntriesForAnalysis(referenceDate?: string): SleepEntry[];
  export function hasEnoughDataForAnalysis(entries: SleepEntry[]): boolean;
  export function isAnalysisFeatureEnabled(): boolean;
  export function getCachedAnalysis(): CachedAnalysis | null;
  export function saveCachedAnalysis(analysis: CachedAnalysis): boolean;
  export function requestSleepAnalysis(entries: SleepEntry[]): Promise<string>;
  ```
  All six are consumed by Task 3's `AiAnalysisCard`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sleepAnalysis.test.ts
import {
  getRecentEntriesForAnalysis,
  hasEnoughDataForAnalysis,
  isAnalysisFeatureEnabled,
  getCachedAnalysis,
  saveCachedAnalysis,
  requestSleepAnalysis,
  CachedAnalysis,
} from './sleepAnalysis';
import * as sleepStorage from './sleepStorage';
import { SleepEntry } from './sleepTypes';

function makeEntry(date: string): SleepEntry {
  return {
    date,
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition: 'refreshed',
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('getRecentEntriesForAnalysis', () => {
  it('includes entries from exactly 13 days before the reference date through the reference date', () => {
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([
      makeEntry('2026-07-20'), // 14 days before -> excluded
      makeEntry('2026-07-21'), // exactly 13 days before -> included
      makeEntry('2026-08-03'), // reference date itself -> included
    ]);
    const result = getRecentEntriesForAnalysis('2026-08-03');
    expect(result.map((e) => e.date)).toEqual(['2026-07-21', '2026-08-03']);
  });

  it('excludes dates after the reference date', () => {
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([makeEntry('2026-08-03'), makeEntry('2026-08-04')]);
    const result = getRecentEntriesForAnalysis('2026-08-03');
    expect(result.map((e) => e.date)).toEqual(['2026-08-03']);
  });
});

describe('hasEnoughDataForAnalysis', () => {
  it('requires at least 3 entries', () => {
    expect(hasEnoughDataForAnalysis([makeEntry('2026-08-01'), makeEntry('2026-08-02')])).toBe(false);
    expect(
      hasEnoughDataForAnalysis([makeEntry('2026-08-01'), makeEntry('2026-08-02'), makeEntry('2026-08-03')])
    ).toBe(true);
  });
});

describe('isAnalysisFeatureEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when the worker URL is not set', () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', '');
    expect(isAnalysisFeatureEnabled()).toBe(false);
  });

  it('is true when the worker URL is set', () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', 'https://example.workers.dev');
    expect(isAnalysisFeatureEnabled()).toBe(true);
  });
});

describe('cached analysis', () => {
  it('returns null when nothing is cached', () => {
    expect(getCachedAnalysis()).toBeNull();
  });

  it('saves and retrieves a cached analysis', () => {
    const analysis: CachedAnalysis = {
      text: '분석 결과입니다',
      generatedAt: '2026-08-03T09:00:00.000Z',
      entryDatesUsed: ['2026-08-01', '2026-08-02', '2026-08-03'],
    };
    expect(saveCachedAnalysis(analysis)).toBe(true);
    expect(getCachedAnalysis()).toEqual(analysis);
  });

  it('falls back to null when the cached JSON is corrupted', () => {
    localStorage.setItem('sleepDiary:aiAnalysis', 'not json');
    expect(getCachedAnalysis()).toBeNull();
  });
});

describe('requestSleepAnalysis', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('throws a friendly error when the worker URL is not configured', async () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', '');
    await expect(requestSleepAnalysis([makeEntry('2026-08-01')])).rejects.toThrow();
  });

  it('returns the analysis text on success', async () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', 'https://example.workers.dev');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('분석 결과 텍스트'),
    }) as unknown as typeof fetch;

    const result = await requestSleepAnalysis([makeEntry('2026-08-01')]);

    expect(result).toBe('분석 결과 텍스트');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.workers.dev',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the response is not ok', async () => {
    vi.stubEnv('VITE_SLEEP_ANALYSIS_WORKER_URL', 'https://example.workers.dev');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await expect(requestSleepAnalysis([makeEntry('2026-08-01')])).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/sleepAnalysis.test.ts`
Expected: FAIL with "Cannot find module './sleepAnalysis'"

- [ ] **Step 3: Implement `sleepAnalysis.ts`**

```ts
// src/lib/sleepAnalysis.ts
import { SleepEntry } from './sleepTypes';
import { getAllEntries } from './sleepStorage';
import { getLocalDateString, addDays } from './dateUtils';

const CACHE_KEY = 'sleepDiary:aiAnalysis';
const ANALYSIS_WINDOW_DAYS = 14;
const MIN_ENTRIES_REQUIRED = 3;

export interface CachedAnalysis {
  text: string;
  generatedAt: string; // ISO datetime
  entryDatesUsed: string[];
}

export function getRecentEntriesForAnalysis(referenceDate: string = getLocalDateString()): SleepEntry[] {
  const cutoff = addDays(referenceDate, -(ANALYSIS_WINDOW_DAYS - 1));
  return getAllEntries().filter((entry) => entry.date >= cutoff && entry.date <= referenceDate);
}

export function hasEnoughDataForAnalysis(entries: SleepEntry[]): boolean {
  return entries.length >= MIN_ENTRIES_REQUIRED;
}

export function isAnalysisFeatureEnabled(): boolean {
  return Boolean(import.meta.env.VITE_SLEEP_ANALYSIS_WORKER_URL);
}

export function getCachedAnalysis(): CachedAnalysis | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAnalysis;
  } catch {
    return null;
  }
}

export function saveCachedAnalysis(analysis: CachedAnalysis): boolean {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(analysis));
    return true;
  } catch {
    return false;
  }
}

export async function requestSleepAnalysis(entries: SleepEntry[]): Promise<string> {
  const workerUrl = import.meta.env.VITE_SLEEP_ANALYSIS_WORKER_URL;
  if (!workerUrl) {
    throw new Error('AI 분석 기능이 설정되지 않았어요');
  }
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    throw new Error(`분석 요청 실패: ${res.status}`);
  }
  return res.text();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/sleepAnalysis.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sleepAnalysis.ts src/lib/sleepAnalysis.test.ts
git commit -m "feat: add client-side sleep analysis request/cache library"
```

---

### Task 3: AI analysis card component

**Files:**
- Create: `src/components/AiAnalysisCard.tsx`
- Create: `src/components/AiAnalysisCard.test.tsx`
- Modify: `src/styles/theme.css`

**Interfaces:**
- Consumes: `getRecentEntriesForAnalysis`, `hasEnoughDataForAnalysis`, `isAnalysisFeatureEnabled`, `getCachedAnalysis`, `saveCachedAnalysis`, `requestSleepAnalysis` from `src/lib/sleepAnalysis.ts` (Task 2); `PixelButton` from `src/components/PixelButton.tsx`.
- Produces: `export function AiAnalysisCard(): JSX.Element | null`, consumed by Task 4's `StatsPage`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/AiAnalysisCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiAnalysisCard } from './AiAnalysisCard';
import * as sleepAnalysis from '../lib/sleepAnalysis';
import { SleepEntry } from '../lib/sleepTypes';

function makeEntry(date: string): SleepEntry {
  return {
    date,
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition: 'refreshed',
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
  };
}

const THREE_ENTRIES = [makeEntry('2026-08-01'), makeEntry('2026-08-02'), makeEntry('2026-08-03')];

beforeEach(() => {
  vi.spyOn(sleepAnalysis, 'isAnalysisFeatureEnabled').mockReturnValue(true);
});

describe('AiAnalysisCard', () => {
  it('renders nothing when the feature is not configured', () => {
    vi.spyOn(sleepAnalysis, 'isAnalysisFeatureEnabled').mockReturnValue(false);
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);

    const { container } = render(<AiAnalysisCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a friendly message with no button when there is not enough data', () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue([makeEntry('2026-08-03')]);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(false);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);

    render(<AiAnalysisCard />);

    expect(screen.getByText(/아직 분석할 데이터가 부족해요/)).toBeInTheDocument();
    expect(screen.queryByText(/AI로 분석받기/)).not.toBeInTheDocument();
  });

  it('shows the analyze button and privacy notice when there is no cached result', () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);

    render(<AiAnalysisCard />);

    expect(screen.getByText('🤖 AI로 분석받기')).toBeInTheDocument();
    expect(screen.getByText(/OpenAI로 전송되어 분석됩니다/)).toBeInTheDocument();
  });

  it('shows the cached result immediately and a "다시 분석받기" button', () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue({
      text: '이전 분석 결과',
      generatedAt: '2026-08-01T00:00:00.000Z',
      entryDatesUsed: ['2026-08-01'],
    });

    render(<AiAnalysisCard />);

    expect(screen.getByText('이전 분석 결과')).toBeInTheDocument();
    expect(screen.getByText('🔄 다시 분석받기')).toBeInTheDocument();
  });

  it('requests a new analysis on click, shows loading, then the result, and caches it', async () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue(null);
    let resolveRequest!: (text: string) => void;
    vi.spyOn(sleepAnalysis, 'requestSleepAnalysis').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    const saveSpy = vi.spyOn(sleepAnalysis, 'saveCachedAnalysis').mockReturnValue(true);

    render(<AiAnalysisCard />);
    await userEvent.click(screen.getByText('🤖 AI로 분석받기'));

    expect(screen.getByText('분석 중이에요...')).toBeInTheDocument();

    resolveRequest('새로운 분석 결과');
    await screen.findByText('새로운 분석 결과');

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '새로운 분석 결과',
        entryDatesUsed: ['2026-08-01', '2026-08-02', '2026-08-03'],
      })
    );
  });

  it('shows an error message and keeps the previous cached result on failure', async () => {
    vi.spyOn(sleepAnalysis, 'getRecentEntriesForAnalysis').mockReturnValue(THREE_ENTRIES);
    vi.spyOn(sleepAnalysis, 'hasEnoughDataForAnalysis').mockReturnValue(true);
    vi.spyOn(sleepAnalysis, 'getCachedAnalysis').mockReturnValue({
      text: '이전 분석 결과',
      generatedAt: '2026-08-01T00:00:00.000Z',
      entryDatesUsed: ['2026-08-01'],
    });
    vi.spyOn(sleepAnalysis, 'requestSleepAnalysis').mockRejectedValue(new Error('network error'));

    render(<AiAnalysisCard />);
    await userEvent.click(screen.getByText('🔄 다시 분석받기'));

    await screen.findByText(/지금은 분석을 받아올 수 없어요/);
    expect(screen.getByText('이전 분석 결과')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/AiAnalysisCard.test.tsx`
Expected: FAIL with "Cannot find module './AiAnalysisCard'"

- [ ] **Step 3: Implement `AiAnalysisCard.tsx`**

```tsx
// src/components/AiAnalysisCard.tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/AiAnalysisCard.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Add pixel-art styles for the card**

Add to `src/styles/theme.css` (append near the end, after `.pull-to-refresh__indicator`):

```css
.ai-analysis-card__result {
  text-align: left;
  white-space: pre-line;
  margin: 12px 0;
}

.ai-analysis-card__notice {
  font-size: 0.75rem;
  color: var(--color-accent-moon);
  margin-top: 8px;
}

.ai-analysis-card__error {
  color: var(--color-accent-pink);
}
```

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/AiAnalysisCard.tsx src/components/AiAnalysisCard.test.tsx src/styles/theme.css
git commit -m "feat: add AI sleep analysis card component"
```

---

### Task 4: Wire into Stats page, env/CI config, and docs

**Files:**
- Modify: `src/pages/StatsPage.tsx`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `AiAnalysisCard` from `src/components/AiAnalysisCard.tsx` (Task 3).
- Produces: nothing new — this is the final integration task.

- [ ] **Step 1: Add `AiAnalysisCard` to `StatsPage.tsx`**

Current `src/pages/StatsPage.tsx`:
```tsx
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
```

Change it to:

```tsx
import { getAllEntries } from '../lib/sleepStorage';
import { bestSleepOnsetBucket, bestSleepDurationBucket } from '../lib/sleepStats';
import { StatsSummary } from '../components/StatsSummary';
import { AiAnalysisCard } from '../components/AiAnalysisCard';

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
      <AiAnalysisCard />
    </div>
  );
}
```

(Only the import line and the added `<AiAnalysisCard />` are new — everything else is unchanged.)

- [ ] **Step 2: Verify existing `StatsPage` tests still pass unmodified**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: PASS (2 tests, unchanged from before this task). This works because `AiAnalysisCard` calls the real `isAnalysisFeatureEnabled()`, which reads `import.meta.env.VITE_SLEEP_ANALYSIS_WORKER_URL` — unset in the test environment, so it returns `false` and `AiAnalysisCard` renders `null`, leaving the existing assertions unaffected.

If this fails, do not modify the two existing `StatsPage.test.tsx` tests to work around it — instead check that `AiAnalysisCard`'s early-return guard (`if (!isAnalysisFeatureEnabled()) return null;`) is actually the first thing it does, before calling `getRecentEntriesForAnalysis()` or any other `sleepAnalysis` function.

- [ ] **Step 3: Create `.env.example`**

```
VITE_SLEEP_ANALYSIS_WORKER_URL=
```

- [ ] **Step 4: Update `.gitignore`**

Add two lines to the existing `.gitignore` (don't remove any existing lines):

```
.env
.env.local
```

Final `.gitignore` should read:
```
node_modules
dist
dist-ssr
*.local
.DS_Store
.superpowers/
.env
.env.local
```

- [ ] **Step 5: Pass the Worker URL through to the production build in `deploy.yml`**

Current relevant block in `.github/workflows/deploy.yml`:
```yaml
      - run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
```

Change to:
```yaml
      - run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
          VITE_SLEEP_ANALYSIS_WORKER_URL: ${{ vars.VITE_SLEEP_ANALYSIS_WORKER_URL }}
```

(`vars.*` is GitHub Actions' repository-variables context — appropriate here since the Worker URL is not secret, only `OPENAI_API_KEY` inside the Worker is. This repository variable must be set manually in GitHub after Task 1's Worker is deployed — see the README section added in Step 6.)

- [ ] **Step 6: Add a Worker deployment section to `README.md`**

Append this section to the end of `README.md` (create the section if the file doesn't already have one with this heading):

```markdown
## AI 수면 분석 기능 설정 (수동, 1회)

이 기능은 별도로 배포하는 Cloudflare Worker가 있어야 동작합니다. 없어도 나머지 앱은 정상 동작하고, AI 분석 카드만 보이지 않습니다.

1. [OpenAI API 키](https://platform.openai.com/api-keys)를 발급받습니다 (결제 수단 등록 필요).
2. [Cloudflare 계정](https://dash.cloudflare.com/sign-up)을 만듭니다 (무료, 신용카드 불필요).
3. Worker를 배포합니다.
   ```bash
   cd worker/sleep-analysis
   npm install
   npx wrangler login
   npx wrangler secret put OPENAI_API_KEY
   # 프롬프트가 뜨면 1번에서 발급받은 키를 붙여넣습니다
   npm run deploy
   ```
   배포가 끝나면 `https://sleep-analysis.<your-subdomain>.workers.dev` 같은 URL이 출력됩니다.
4. 이 저장소의 GitHub 페이지에서 Settings > Secrets and variables > Actions > Variables 탭으로 이동해 `VITE_SLEEP_ANALYSIS_WORKER_URL` 이름으로 3번에서 받은 URL을 등록합니다 (Secret이 아니라 **Variable**입니다 — URL 자체는 비밀이 아닙니다).
5. 로컬 개발 시에도 쓰려면 `.env.example`을 복사해 `.env`를 만들고 같은 URL을 채웁니다.
   ```bash
   cp .env.example .env
   ```
6. main에 다시 push하면 (또는 Actions에서 `Deploy to GitHub Pages`를 수동 재실행하면) 이 환경변수가 빌드에 포함되어 배포됩니다.

**참고:** `worker/sleep-analysis`는 이 앱의 `npm run build`/GitHub Pages 배포와는 완전히 별개로 배포됩니다 (`npm run deploy`를 Worker 폴더 안에서 직접 실행). Worker 코드를 수정한 뒤에는 이 배포 명령을 다시 실행해야 반영됩니다.
```

- [ ] **Step 7: Run the full suite and production build**

Run: `npm test`
Expected: PASS (all tests, no regressions)

Run: `npm run build`
Expected: build succeeds (the AI feature is simply disabled in this local build since `VITE_SLEEP_ANALYSIS_WORKER_URL` isn't set — that's expected and correct).

- [ ] **Step 8: Commit**

```bash
git add src/pages/StatsPage.tsx .env.example .gitignore .github/workflows/deploy.yml README.md
git commit -m "feat: wire AI analysis card into stats page, add Worker deployment docs"
```

---

## Post-plan manual step (not a task — do after Task 4)

Follow the new "AI 수면 분석 기능 설정" section in `README.md` to actually deploy the Worker with a real `OPENAI_API_KEY` and register the `VITE_SLEEP_ANALYSIS_WORKER_URL` GitHub Actions variable. Until that's done, the feature stays silently disabled in production (by design) — no automated task in this plan can do this part, since it requires a real OpenAI account with billing and a real Cloudflare account.
