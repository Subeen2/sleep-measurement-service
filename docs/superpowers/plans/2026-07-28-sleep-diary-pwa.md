# 잠순이 잠돌이 일기장 (Sleep Diary PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a friendly, pixel-art PWA sleep diary that, from a bedtime, last-screen-time, and wake-time, computes an estimated sleep duration, requires a condition check-in on every entry, accepts optional caffeine/alcohol/last-meal details, and lets the user browse history on a calendar and see simple "best sleep window" statistics.

**Architecture:** Client-only React + Vite PWA, no backend and no build-time data generation (unlike the sibling `grow_up_everyday` project, this app's data is created by the user, not fetched from static JSON). Entries are stored as a single JSON map in `localStorage`, keyed by date. All read/compute operations are synchronous — no loading states are needed the way the reference project needed them for `fetch`. The PWA shell (manifest, service worker, GitHub Pages deploy pipeline, pixel-art design tokens, tab-based navigation with no router, best-effort notification opt-in) is set up identically to `C:/SUBEEN/grow_up_everyday`, adapted to a night/pixel-cozy palette.

**Tech Stack:** React 18.3, TypeScript 5.5, Vite 5.4, `vite-plugin-pwa` 0.20, Vitest 2.0 + React Testing Library, GitHub Actions + GitHub Pages.

## Global Constraints

- Package versions must match the reference project exactly: `react@^18.3.1`, `react-dom@^18.3.1`, `typescript@^5.5.4`, `vite@^5.4.1`, `vite-plugin-pwa@^0.20.1`, `vitest@^2.0.5`, `@testing-library/react@^16.0.0`, `@testing-library/user-event@^14.5.2`, `@testing-library/jest-dom@^6.4.8`, `@vitejs/plugin-react@^4.3.1`, `jsdom@^24.1.1`, `pngjs@^7.0.0`.
- No client-side router — tab switching is plain `useState` (matches reference's YAGNI decision).
- No server/backend of any kind. All persistence is `localStorage`. No API keys, no `.env` needed for this app.
- Deploy target is GitHub Pages via GitHub Actions, same two-job (`build` → `deploy`) workflow shape as the reference project.
- Pixel-art design system: thick pixel borders + hard (non-blurred) drop shadows, `Galmuri11` pixel font for titles/labels, general sans-serif is not substituted anywhere the reference used Galmuri (buttons, headings, labels all use Galmuri11 for consistency).
- Korean UI copy is used verbatim for the condition/labels the user specified in the feature request: 피곤함 / 평소보다 개운함 / 개운함, and 머리아픔 / 멍함 / 안아픔.
- Friendly tone copy (e.g. "오늘도 잘 자요") appears in the app shell/greeting text — this is a product requirement, not a nice-to-have.

## Key Design Decisions (read before implementing)

1. **"추정 수면 시간" formula.** The spec says bed time, last-screen time, and wake time together produce the estimate. Bed time and last-screen time are rarely the same moment (people lie down and keep scrolling), so the last confirmed-awake instant is the last-screen time, not the bed time. This plan defines **추정 수면 시간 (estimated sleep duration) = wake time − last-screen time**, and separately exposes **뒤척인 시간 (restless time) = last-screen time − bed time** for context in the detail view. All three still feed the record; bed time just isn't part of the duration subtraction.
2. **Overnight time math.** Bed/last-screen/wake times are entered as plain `HH:mm` with no date attached, and they almost always cross midnight. `resolveSequentialMinutes` (Task 5) rolls each time forward by 24h whenever it would otherwise appear earlier than the previous one, assuming the three inputs are always chronological (bed ≤ last-screen ≤ wake).
3. **"컨디션" used for statistics.** The user specified two condition axes: overall freshness (피곤함/평소보다 개운함/개운함) and a physical-symptom axis (머리아픔/멍함/안아픔). The two statistics questions ("어느 시간대에 자야/얼마나 자야 가장 좋은 컨디션을 유지") are scored using the overall-freshness axis only (mapped to 0/1/2), since that's the axis literally named "컨디션". The physical-symptom axis is recorded and shown in history but is not part of the aggregate score — folding both axes into one composite score wasn't asked for and would need an arbitrary weighting, so it's left out (YAGNI).
4. **Tie-breaking in stats.** `bestSleepOnsetBucket`/`bestSleepDurationBucket` return the first bucket (in entry-insertion order) with the highest average score when there's a tie. No fancier tie-breaking was requested.
5. **No date picker on the record page.** The record page always edits *today's* entry (create or edit). Logging a missed prior day isn't in the feature request, so it's out of scope; history is read-only browsing.
6. **Notification opt-in mirrors the reference app's best-effort pattern** (`Notification.requestPermission` + optional `periodicSync` registration where supported, silently ignored otherwise) because the user asked for the PWA/architecture parts to be set up identically, and that pattern is part of the reference PWA's architecture.

## File Structure

```
in_my_dreams/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .gitignore
├── README.md
├── .github/workflows/deploy.yml
├── public/
│   ├── fonts/Galmuri11.woff2, OFL.txt   (copied from grow_up_everyday)
│   └── pwa-192x192.png, pwa-512x512.png (generated, night palette)
├── scripts/generate-placeholder-icons.mjs
└── src/
    ├── main.tsx
    ├── App.tsx / App.test.tsx
    ├── styles/theme.css
    ├── test/setup.ts
    ├── lib/
    │   ├── dateUtils.ts / .test.ts
    │   ├── sleepTypes.ts
    │   ├── sleepCalc.ts / .test.ts
    │   ├── sleepStorage.ts / .test.ts
    │   ├── sleepStats.ts / .test.ts
    │   └── reminder.ts / .test.ts
    ├── components/
    │   ├── PixelButton.tsx / .test.tsx
    │   ├── PullToRefresh.tsx / .test.tsx
    │   ├── PixelRadioGroup.tsx / .test.tsx
    │   ├── SleepEntryForm.tsx / .test.tsx
    │   ├── CalendarView.tsx / .test.tsx
    │   ├── DayDetailCard.tsx / .test.tsx
    │   └── StatsSummary.tsx / .test.tsx
    └── pages/
        ├── TodayPage.tsx / .test.tsx
        ├── HistoryPage.tsx / .test.tsx
        └── StatsPage.tsx / .test.tsx
```

---

### Task 1: Project scaffolding, tooling & PWA/deploy pipeline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.github/workflows/deploy.yml`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (placeholder shell, replaced in Task 13)
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx` (placeholder smoke test, replaced in Task 13)
- Create: `README.md`

**Interfaces:**
- Produces: a working `npm install` / `npm test` / `npm run build` toolchain that every later task relies on. `src/App.tsx` exports `export function App()` — later tasks (2–13) modify this file's internals but must keep that export name and zero-arg signature.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "in-my-dreams",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate:icons": "node scripts/generate-placeholder-icons.mjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "pngjs": "^7.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.1",
    "vite-plugin-pwa": "^0.20.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json` and `tsconfig.node.json`**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "scripts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts` with the PWA plugin and Vitest config**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  appType: 'mpa',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: '잠순이 잠돌이 일기장',
        short_name: '잠자기 일기',
        description: '매일 수면과 컨디션을 기록하는 픽셀아트 일기장',
        theme_color: '#2e2b52',
        background_color: '#2e2b52',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>잠순이 잠돌이 일기장</title>
    <link rel="preload" href="/fonts/Galmuri11.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
dist-ssr
*.local
.DS_Store
```

- [ ] **Step 6: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 7: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 8: Create the placeholder `src/App.tsx` and `src/main.tsx`**

`src/App.tsx` (replaced with the full tab shell in Task 13 — this placeholder only exists so the toolchain has something to build/test):

```tsx
export function App() {
  return (
    <div className="app">
      <h1>잠순이 잠돌이 일기장</h1>
    </div>
  );
}
```

`src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Also create an empty `src/styles/theme.css` (filled in during Task 2) with just:

```css
body {
  margin: 0;
}
```

- [ ] **Step 9: Write the placeholder smoke test `src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('잠순이 잠돌이 일기장')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Install dependencies and verify the toolchain**

Run: `npm install`
Then run: `npm test`
Expected: PASS (1 test)

Then run: `npm run build`
Expected: build succeeds, `dist/manifest.webmanifest` and `dist/sw.js` are generated. (The build will emit a warning about missing `public/pwa-192x192.png`/`pwa-512x512.png` — that's expected here and resolved in Task 2.)

- [ ] **Step 11: Commit**

```bash
git init
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore .github README.md src
git commit -m "chore: scaffold Vite/React/TS PWA project with GitHub Pages deploy"
```

(If `README.md` doesn't exist yet, create a minimal one first: `# 잠순이 잠돌이 일기장` + one line describing the app, matching the reference project's README style. It will be fleshed out further in Task 13.)

---

### Task 2: Pixel-art design system & shared UI primitives

**Files:**
- Create: `public/fonts/Galmuri11.woff2` (copied)
- Create: `public/fonts/OFL.txt` (copied)
- Modify: `scripts/generate-placeholder-icons.mjs` (create)
- Modify: `src/styles/theme.css`
- Create: `src/components/PixelButton.tsx`
- Create: `src/components/PixelButton.test.tsx`
- Create: `src/components/PullToRefresh.tsx`
- Create: `src/components/PullToRefresh.test.tsx`
- Create: `src/components/PixelRadioGroup.tsx`
- Create: `src/components/PixelRadioGroup.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `export function PixelButton({ children, className, ...rest }: PixelButtonProps)` (extends `ButtonHTMLAttributes<HTMLButtonElement>`), `export function PullToRefresh({ children, onRefresh, threshold }: PullToRefreshProps)`, and `export function PixelRadioGroup<T extends string>({ legend, options, value, onChange }: PixelRadioGroupProps<T>)` where `options: { value: T; label: string }[]`, `value: T | undefined`, `onChange: (value: T) => void`. All three are consumed by Task 7 (`SleepEntryForm`), Task 13 (`App`), and various pages.

- [ ] **Step 1: Copy the shared pixel font from the sibling project**

Run:
```bash
mkdir -p public/fonts
cp "C:/SUBEEN/grow_up_everyday/public/fonts/Galmuri11.woff2" public/fonts/Galmuri11.woff2
cp "C:/SUBEEN/grow_up_everyday/public/fonts/OFL.txt" public/fonts/OFL.txt
```

(If the sibling project ever moves, `Galmuri11` is also available from the public Galmuri font project under OFL — re-download it there instead.)

- [ ] **Step 2: Write `scripts/generate-placeholder-icons.mjs` (night palette) and generate icons**

```js
import { PNG } from 'pngjs';
import fs from 'node:fs';

function createSolidIcon(size, outPath) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = 0x2e;
      png.data[idx + 1] = 0x2b;
      png.data[idx + 2] = 0x52;
      png.data[idx + 3] = 0xff;
    }
  }
  fs.writeFileSync(outPath, PNG.sync.write(png));
}

createSolidIcon(192, 'public/pwa-192x192.png');
createSolidIcon(512, 'public/pwa-512x512.png');
console.log('Placeholder icons generated at public/pwa-192x192.png and public/pwa-512x512.png');
```

Run: `npm run generate:icons`
Expected: `public/pwa-192x192.png` and `public/pwa-512x512.png` are created.

- [ ] **Step 3: Write the failing test for `PixelButton`**

```tsx
// src/components/PixelButton.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PixelButton } from './PixelButton';

describe('PixelButton', () => {
  it('renders children and applies the pixel-button class', () => {
    render(<PixelButton>눌러줘</PixelButton>);
    const button = screen.getByText('눌러줘');
    expect(button).toHaveClass('pixel-button');
  });

  it('merges a custom className with the base class', () => {
    render(<PixelButton className="extra">눌러줘</PixelButton>);
    expect(screen.getByText('눌러줘')).toHaveClass('pixel-button', 'extra');
  });

  it('forwards click handlers and native button props', async () => {
    const onClick = vi.fn();
    render(
      <PixelButton onClick={onClick} disabled>
        눌러줘
      </PixelButton>
    );
    expect(screen.getByText('눌러줘')).toBeDisabled();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/components/PixelButton.test.tsx`
Expected: FAIL with "Cannot find module './PixelButton'"

- [ ] **Step 5: Implement `PixelButton`**

```tsx
// src/components/PixelButton.tsx
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function PixelButton({ children, className, ...rest }: PixelButtonProps) {
  return (
    <button className={['pixel-button', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/PixelButton.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Copy `PullToRefresh` and its test verbatim from the sibling project**

```bash
cp "C:/SUBEEN/grow_up_everyday/src/components/PullToRefresh.tsx" src/components/PullToRefresh.tsx
cp "C:/SUBEEN/grow_up_everyday/src/components/PullToRefresh.test.tsx" src/components/PullToRefresh.test.tsx
```

Run: `npx vitest run src/components/PullToRefresh.test.tsx`
Expected: PASS (6 tests) — this file is architecture-identical to the reference app, so no changes are needed.

- [ ] **Step 8: Write the failing test for `PixelRadioGroup`**

```tsx
// src/components/PixelRadioGroup.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PixelRadioGroup } from './PixelRadioGroup';

type Choice = 'a' | 'b' | 'c';
const OPTIONS: { value: Choice; label: string }[] = [
  { value: 'a', label: '옵션 A' },
  { value: 'b', label: '옵션 B' },
  { value: 'c', label: '옵션 C' },
];

describe('PixelRadioGroup', () => {
  it('renders the legend and all options', () => {
    render(<PixelRadioGroup legend="선택하세요" options={OPTIONS} value={undefined} onChange={() => {}} />);
    expect(screen.getByText('선택하세요')).toBeInTheDocument();
    expect(screen.getByText('옵션 A')).toBeInTheDocument();
    expect(screen.getByText('옵션 B')).toBeInTheDocument();
    expect(screen.getByText('옵션 C')).toBeInTheDocument();
  });

  it('marks the selected option as pressed', () => {
    render(<PixelRadioGroup legend="선택하세요" options={OPTIONS} value="b" onChange={() => {}} />);
    expect(screen.getByText('옵션 A')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('옵션 B')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn();
    render(<PixelRadioGroup legend="선택하세요" options={OPTIONS} value={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByText('옵션 C'));
    expect(onChange).toHaveBeenCalledWith('c');
  });
});
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `npx vitest run src/components/PixelRadioGroup.test.tsx`
Expected: FAIL with "Cannot find module './PixelRadioGroup'"

- [ ] **Step 10: Implement `PixelRadioGroup`**

```tsx
// src/components/PixelRadioGroup.tsx
interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface PixelRadioGroupProps<T extends string> {
  legend: string;
  options: RadioOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function PixelRadioGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: PixelRadioGroupProps<T>) {
  return (
    <fieldset className="pixel-radio-group">
      <legend>{legend}</legend>
      <div className="pixel-radio-group__options">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              'pixel-button',
              'pixel-radio-group__option',
              value === opt.value ? 'pixel-radio-group__option--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `npx vitest run src/components/PixelRadioGroup.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 12: Fill in `src/styles/theme.css` with the night pixel-art palette**

```css
@font-face {
  font-family: 'Galmuri11';
  src: url('/fonts/Galmuri11.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

:root {
  --color-bg: #2e2b52;
  --color-card: #3f3b6b;
  --color-wood: #c9a876;
  --color-wood-dark: #a8875c;
  --color-accent-moon: #f4e4a6;
  --color-accent-pink: #f4c6d7;
  --color-accent-lavender: #d8c6f4;
  --color-text: #f5f0e6;
  --shadow-pixel: 4px 4px 0 var(--color-wood-dark);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'Galmuri11', sans-serif;
}

.pull-to-refresh {
  min-height: 100vh;
  min-height: 100dvh;
}

.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.pixel-button {
  font-family: 'Galmuri11', sans-serif;
  background: var(--color-wood);
  color: #3a3a3a;
  border: 3px solid var(--color-wood-dark);
  box-shadow: var(--shadow-pixel);
  padding: 8px 12px;
  cursor: pointer;
}

.pixel-button:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.pixel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.word-card {
  background: var(--color-card);
  border: 6px solid var(--color-wood-dark);
  box-shadow: var(--shadow-pixel);
  padding: 24px 16px;
  text-align: center;
  margin-bottom: 16px;
}

.pixel-radio-group {
  border: none;
  margin: 0 0 12px;
  padding: 0;
}

.pixel-radio-group__options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pixel-radio-group__option--selected {
  background: var(--color-accent-lavender);
}

.sleep-entry-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sleep-entry-form__error {
  color: var(--color-accent-pink);
}

.calendar-view__weekdays,
.calendar-view__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-view__weekdays {
  text-align: center;
  margin-bottom: 4px;
}

.calendar-view__day {
  font-family: 'Galmuri11', sans-serif;
  background: var(--color-wood);
  border: 2px solid var(--color-wood-dark);
  padding: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.calendar-view__day--selected {
  background: var(--color-accent-pink);
}

.stats-summary__value {
  font-size: 1.25rem;
}

.pull-to-refresh__indicator {
  text-align: center;
  padding: 8px;
  font-size: 0.85rem;
  color: var(--color-accent-moon);
}
```

- [ ] **Step 13: Run the full test suite and verify nothing broke**

Run: `npm test`
Expected: PASS (all tests so far)

- [ ] **Step 14: Commit**

```bash
git add public/fonts scripts/generate-placeholder-icons.mjs public/pwa-192x192.png public/pwa-512x512.png src/styles/theme.css src/components/PixelButton.tsx src/components/PixelButton.test.tsx src/components/PullToRefresh.tsx src/components/PullToRefresh.test.tsx src/components/PixelRadioGroup.tsx src/components/PixelRadioGroup.test.tsx
git commit -m "feat: add night pixel-art design system and shared UI primitives"
```

---

### Task 3: Notification opt-in (PWA architecture parity)

**Files:**
- Create: `src/lib/reminder.ts`
- Create: `src/lib/reminder.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export async function requestNotificationPermissionAndSync(): Promise<void>`, consumed by Task 13 (`App`'s "🔔 알림 켜기" button).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/reminder.test.ts
import { requestNotificationPermissionAndSync } from './reminder';

describe('requestNotificationPermissionAndSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when the Notification API is unavailable', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(requestNotificationPermissionAndSync()).resolves.toBeUndefined();
  });

  it('does nothing when permission is denied', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') });
    await expect(requestNotificationPermissionAndSync()).resolves.toBeUndefined();
  });

  it('registers periodic sync when permission is granted and the environment supports it', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ periodicSync: { register } }),
      },
    });

    await requestNotificationPermissionAndSync();

    expect(register).toHaveBeenCalledWith('sleep-diary-reminder', { minInterval: 24 * 60 * 60 * 1000 });
  });

  it('silently ignores environments without periodicSync support', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({}),
      },
    });

    await expect(requestNotificationPermissionAndSync()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/reminder.test.ts`
Expected: FAIL with "Cannot find module './reminder'"

- [ ] **Step 3: Implement `reminder.ts`**

```ts
// src/lib/reminder.ts
export async function requestNotificationPermissionAndSync(): Promise<void> {
  if (typeof Notification === 'undefined') return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;

  if (!('periodicSync' in registration)) return; // best-effort — most browsers don't support this
  try {
    await (registration as any).periodicSync.register('sleep-diary-reminder', {
      minInterval: 24 * 60 * 60 * 1000,
    });
  } catch {
    // unsupported/denied — best-effort, so fail silently
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/reminder.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/reminder.ts src/lib/reminder.test.ts
git commit -m "feat: add best-effort notification opt-in"
```

---

### Task 4: Domain types & date utilities

**Files:**
- Create: `src/lib/sleepTypes.ts`
- Create: `src/lib/dateUtils.ts`
- Create: `src/lib/dateUtils.test.ts`

**Interfaces:**
- Produces types consumed by nearly every later task:
  ```ts
  export type OverallCondition = 'tired' | 'better_than_usual' | 'refreshed';
  export type PhysicalCondition = 'headache' | 'groggy' | 'none';
  export type AlcoholType = 'beer' | 'wine' | 'soju' | 'spirits' | 'other';

  export interface SleepEntry {
    date: string; // YYYY-MM-DD, the day this entry represents (the wake-up day)
    bedTime: string; // "HH:mm"
    lastScreenTime: string; // "HH:mm"
    wakeTime: string; // "HH:mm"
    overallCondition: OverallCondition;
    physicalCondition: PhysicalCondition;
    caffeineShots: number; // 0 if none
    caffeineTime?: string; // "HH:mm"
    hadAlcohol: boolean;
    alcoholType?: AlcoholType;
    lastMealTime?: string; // "HH:mm"
  }
  ```
- Produces: `export function getLocalDateString(d?: Date): string`, `export function addDays(dateString: string, days: number): string`, `export function getDaysInMonth(year: number, month: number): number` (month is 1–12), `export function getFirstWeekdayOfMonth(year: number, month: number): number` (0=Sun..6=Sat). Consumed by Tasks 5, 6, 7, 8, 9, 10.

- [ ] **Step 1: Create `src/lib/sleepTypes.ts`**

```ts
export type OverallCondition = 'tired' | 'better_than_usual' | 'refreshed';
export type PhysicalCondition = 'headache' | 'groggy' | 'none';
export type AlcoholType = 'beer' | 'wine' | 'soju' | 'spirits' | 'other';

export interface SleepEntry {
  date: string; // YYYY-MM-DD, the day this entry represents (the wake-up day)
  bedTime: string; // "HH:mm"
  lastScreenTime: string; // "HH:mm"
  wakeTime: string; // "HH:mm"
  overallCondition: OverallCondition;
  physicalCondition: PhysicalCondition;
  caffeineShots: number; // 0 if none
  caffeineTime?: string; // "HH:mm"
  hadAlcohol: boolean;
  alcoholType?: AlcoholType;
  lastMealTime?: string; // "HH:mm"
}
```

(No test needed for a pure type-only file — nothing to execute.)

- [ ] **Step 2: Write the failing tests for `dateUtils`**

```ts
// src/lib/dateUtils.test.ts
import { getLocalDateString, addDays, getDaysInMonth, getFirstWeekdayOfMonth } from './dateUtils';

describe('getLocalDateString', () => {
  it('formats a date as YYYY-MM-DD with zero-padded month and day', () => {
    expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getLocalDateString(new Date(2026, 10, 23))).toBe('2026-11-23');
  });
});

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-07-20', 3)).toBe('2026-07-23');
  });

  it('rolls over into the next month', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02');
  });

  it('rolls over into the next year', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('supports negative offsets', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for July', () => {
    expect(getDaysInMonth(2026, 7)).toBe(31);
  });

  it('returns 28 for a non-leap February', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28);
  });

  it('returns 29 for a leap February', () => {
    expect(getDaysInMonth(2028, 2)).toBe(29);
  });
});

describe('getFirstWeekdayOfMonth', () => {
  it('returns the JS Date weekday (0=Sun) of the 1st of the month', () => {
    // 2026-07-01 is a Wednesday
    expect(getFirstWeekdayOfMonth(2026, 7)).toBe(3);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/dateUtils.test.ts`
Expected: FAIL with "Cannot find module './dateUtils'"

- [ ] **Step 4: Implement `dateUtils.ts`**

```ts
// src/lib/dateUtils.ts
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/dateUtils.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/sleepTypes.ts src/lib/dateUtils.ts src/lib/dateUtils.test.ts
git commit -m "feat: add sleep entry domain types and date utilities"
```

---

### Task 5: Sleep duration calculation

**Files:**
- Create: `src/lib/sleepCalc.ts`
- Create: `src/lib/sleepCalc.test.ts`

**Interfaces:**
- Consumes: `SleepEntry` from `src/lib/sleepTypes.ts` (Task 4).
- Produces:
  ```ts
  export function resolveSequentialMinutes(times: string[]): number[];
  export function calculateEstimatedSleepMinutes(
    entry: Pick<SleepEntry, 'bedTime' | 'lastScreenTime' | 'wakeTime'>
  ): number;
  export function calculateRestlessMinutes(
    entry: Pick<SleepEntry, 'bedTime' | 'lastScreenTime' | 'wakeTime'>
  ): number;
  export function formatMinutesAsDuration(totalMinutes: number): string;
  ```
  Consumed by Task 7 (form preview), Task 8 (`TodayPage`), Task 9 (`DayDetailCard`), Task 11 (`sleepStats`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sleepCalc.test.ts
import {
  resolveSequentialMinutes,
  calculateEstimatedSleepMinutes,
  calculateRestlessMinutes,
  formatMinutesAsDuration,
} from './sleepCalc';

describe('resolveSequentialMinutes', () => {
  it('keeps times on the same day when already increasing', () => {
    expect(resolveSequentialMinutes(['23:00', '23:30', '23:45'])).toEqual([1380, 1410, 1425]);
  });

  it('rolls a time forward by 24h once it appears to go backwards (midnight crossing)', () => {
    expect(resolveSequentialMinutes(['23:00', '23:30', '07:00'])).toEqual([1380, 1410, 1860]);
  });

  it('rolls forward multiple times in sequence when needed', () => {
    // bed 23:50, last screen just after midnight, wake next morning
    expect(resolveSequentialMinutes(['23:50', '00:10', '07:00'])).toEqual([1430, 1450, 1860]);
  });

  it('treats an equal consecutive time as zero elapsed minutes, not a rollover', () => {
    expect(resolveSequentialMinutes(['23:00', '23:00', '07:00'])).toEqual([1380, 1380, 1860]);
  });
});

describe('calculateEstimatedSleepMinutes', () => {
  it('uses wake time minus last-screen time, not bed time', () => {
    const entry = { bedTime: '23:00', lastScreenTime: '23:30', wakeTime: '07:00' };
    expect(calculateEstimatedSleepMinutes(entry)).toBe(450); // 7h30m
  });

  it('handles a last-screen time that crosses midnight', () => {
    const entry = { bedTime: '23:50', lastScreenTime: '00:10', wakeTime: '07:00' };
    expect(calculateEstimatedSleepMinutes(entry)).toBe(410); // 6h50m
  });
});

describe('calculateRestlessMinutes', () => {
  it('is the gap between lying down and the last screen check', () => {
    const entry = { bedTime: '23:00', lastScreenTime: '23:30', wakeTime: '07:00' };
    expect(calculateRestlessMinutes(entry)).toBe(30);
  });

  it('is zero when the last screen check happens right at bed time', () => {
    const entry = { bedTime: '23:00', lastScreenTime: '23:00', wakeTime: '07:00' };
    expect(calculateRestlessMinutes(entry)).toBe(0);
  });
});

describe('formatMinutesAsDuration', () => {
  it('formats whole hours without a minutes suffix', () => {
    expect(formatMinutesAsDuration(420)).toBe('7시간');
  });

  it('formats hours and minutes together', () => {
    expect(formatMinutesAsDuration(450)).toBe('7시간 30분');
  });

  it('formats less than an hour as just minutes', () => {
    expect(formatMinutesAsDuration(45)).toBe('0시간 45분');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/sleepCalc.test.ts`
Expected: FAIL with "Cannot find module './sleepCalc'"

- [ ] **Step 3: Implement `sleepCalc.ts`**

```ts
// src/lib/sleepCalc.ts
import { SleepEntry } from './sleepTypes';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Resolves HH:mm clock times known to occur in chronological order
 * (possibly crossing midnight) into minute offsets from the first time,
 * rolling each subsequent time forward by 24h whenever it would
 * otherwise appear earlier than the one before it.
 */
export function resolveSequentialMinutes(times: string[]): number[] {
  const result: number[] = [];
  let dayOffset = 0;
  for (let i = 0; i < times.length; i++) {
    let absolute = toMinutes(times[i]) + dayOffset * 1440;
    if (i > 0 && absolute < result[i - 1]) {
      dayOffset += 1;
      absolute += 1440;
    }
    result.push(absolute);
  }
  return result;
}

export function calculateEstimatedSleepMinutes(
  entry: Pick<SleepEntry, 'bedTime' | 'lastScreenTime' | 'wakeTime'>
): number {
  const [, lastScreenAbs, wakeAbs] = resolveSequentialMinutes([
    entry.bedTime,
    entry.lastScreenTime,
    entry.wakeTime,
  ]);
  return wakeAbs - lastScreenAbs;
}

export function calculateRestlessMinutes(
  entry: Pick<SleepEntry, 'bedTime' | 'lastScreenTime' | 'wakeTime'>
): number {
  const [bedAbs, lastScreenAbs] = resolveSequentialMinutes([
    entry.bedTime,
    entry.lastScreenTime,
    entry.wakeTime,
  ]);
  return lastScreenAbs - bedAbs;
}

export function formatMinutesAsDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/sleepCalc.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sleepCalc.ts src/lib/sleepCalc.test.ts
git commit -m "feat: add estimated sleep duration calculation"
```

---

### Task 6: LocalStorage persistence layer

**Files:**
- Create: `src/lib/sleepStorage.ts`
- Create: `src/lib/sleepStorage.test.ts`

**Interfaces:**
- Consumes: `SleepEntry` from `src/lib/sleepTypes.ts` (Task 4).
- Produces:
  ```ts
  export function saveEntry(entry: SleepEntry): void;
  export function getEntry(date: string): SleepEntry | null;
  export function getAllEntries(): SleepEntry[]; // sorted by date, newest first
  export function deleteEntry(date: string): void;
  ```
  Consumed by Task 8 (`TodayPage`), Task 10 (`HistoryPage`), Task 12 (`StatsPage`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sleepStorage.test.ts
import { saveEntry, getEntry, getAllEntries, deleteEntry } from './sleepStorage';
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

describe('sleepStorage', () => {
  it('returns null for a date with no saved entry', () => {
    expect(getEntry('2026-07-28')).toBeNull();
  });

  it('saves and retrieves an entry by date', () => {
    const entry = makeEntry('2026-07-28');
    saveEntry(entry);
    expect(getEntry('2026-07-28')).toEqual(entry);
  });

  it('overwrites an existing entry for the same date', () => {
    saveEntry(makeEntry('2026-07-28'));
    const updated = { ...makeEntry('2026-07-28'), overallCondition: 'tired' as const };
    saveEntry(updated);
    expect(getEntry('2026-07-28')).toEqual(updated);
  });

  it('lists all entries sorted by date, newest first', () => {
    saveEntry(makeEntry('2026-07-26'));
    saveEntry(makeEntry('2026-07-28'));
    saveEntry(makeEntry('2026-07-27'));
    expect(getAllEntries().map((e) => e.date)).toEqual(['2026-07-28', '2026-07-27', '2026-07-26']);
  });

  it('returns an empty array when nothing has been saved', () => {
    expect(getAllEntries()).toEqual([]);
  });

  it('deletes an entry by date', () => {
    saveEntry(makeEntry('2026-07-28'));
    deleteEntry('2026-07-28');
    expect(getEntry('2026-07-28')).toBeNull();
  });

  it('falls back to an empty store when stored JSON is corrupted', () => {
    localStorage.setItem('sleepDiary:entries', 'not valid json');
    expect(getAllEntries()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/sleepStorage.test.ts`
Expected: FAIL with "Cannot find module './sleepStorage'"

- [ ] **Step 3: Implement `sleepStorage.ts`**

```ts
// src/lib/sleepStorage.ts
import { SleepEntry } from './sleepTypes';

const STORAGE_KEY = 'sleepDiary:entries';

function readAll(): Record<string, SleepEntry> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, SleepEntry>;
  } catch {
    return {};
  }
}

function writeAll(entries: Record<string, SleepEntry>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveEntry(entry: SleepEntry): void {
  const all = readAll();
  all[entry.date] = entry;
  writeAll(all);
}

export function getEntry(date: string): SleepEntry | null {
  const all = readAll();
  return all[date] ?? null;
}

export function getAllEntries(): SleepEntry[] {
  return Object.values(readAll()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function deleteEntry(date: string): void {
  const all = readAll();
  delete all[date];
  writeAll(all);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/sleepStorage.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sleepStorage.ts src/lib/sleepStorage.test.ts
git commit -m "feat: add localStorage persistence for sleep entries"
```

---

### Task 7: Sleep entry form

**Files:**
- Create: `src/components/SleepEntryForm.tsx`
- Create: `src/components/SleepEntryForm.test.tsx`

**Interfaces:**
- Consumes: `SleepEntry`, `OverallCondition`, `PhysicalCondition`, `AlcoholType` from `src/lib/sleepTypes.ts` (Task 4); `PixelRadioGroup` from `src/components/PixelRadioGroup.tsx` (Task 2); `PixelButton` from `src/components/PixelButton.tsx` (Task 2).
- Produces:
  ```ts
  interface SleepEntryFormProps {
    date: string;
    initialEntry?: SleepEntry;
    onSubmit: (entry: SleepEntry) => void;
  }
  export function SleepEntryForm(props: SleepEntryFormProps): JSX.Element;
  ```
  Consumed by Task 8 (`TodayPage`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/SleepEntryForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SleepEntryForm } from './SleepEntryForm';
import { SleepEntry } from '../lib/sleepTypes';

describe('SleepEntryForm', () => {
  it('shows an error and does not submit when required fields are missing', async () => {
    const onSubmit = vi.fn();
    render(<SleepEntryForm date="2026-07-28" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByText('기록하기'));

    expect(screen.getByText(/필수예요/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a complete entry with only the required fields filled', async () => {
    const onSubmit = vi.fn();
    render(<SleepEntryForm date="2026-07-28" onSubmit={onSubmit} />);

    // fireEvent.change (not userEvent.type) is used for time inputs: jsdom's
    // value-sanitization for type="time" rejects the partial values that
    // userEvent's keystroke-by-keystroke typing would produce along the way.
    fireEvent.change(screen.getByLabelText('자려고 누운 시간'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('마지막으로 화면을 본 시간'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('기상 시간'), { target: { value: '07:00' } });
    await userEvent.click(screen.getByText('개운함'));
    await userEvent.click(screen.getByText('안아픔'));
    await userEvent.click(screen.getByText('기록하기'));

    expect(onSubmit).toHaveBeenCalledWith({
      date: '2026-07-28',
      bedTime: '23:00',
      lastScreenTime: '23:30',
      wakeTime: '07:00',
      overallCondition: 'refreshed',
      physicalCondition: 'none',
      caffeineShots: 0,
      caffeineTime: undefined,
      hadAlcohol: false,
      alcoholType: undefined,
      lastMealTime: undefined,
    });
  });

  it('reveals the caffeine time field only once shots are greater than zero', async () => {
    render(<SleepEntryForm date="2026-07-28" onSubmit={() => {}} />);
    expect(screen.queryByLabelText('카페인 섭취 시간 (선택)')).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('카페인 섭취량 (1샷 기준)'));
    await userEvent.type(screen.getByLabelText('카페인 섭취량 (1샷 기준)'), '2');

    expect(screen.getByLabelText('카페인 섭취 시간 (선택)')).toBeInTheDocument();
  });

  it('reveals the alcohol type picker only once "음주 여부" is checked', async () => {
    render(<SleepEntryForm date="2026-07-28" onSubmit={() => {}} />);
    expect(screen.queryByText('주종')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('음주 여부'));

    expect(screen.getByText('주종')).toBeInTheDocument();
  });

  it('pre-fills fields from an initial entry when editing', () => {
    const initialEntry: SleepEntry = {
      date: '2026-07-28',
      bedTime: '23:00',
      lastScreenTime: '23:30',
      wakeTime: '07:00',
      overallCondition: 'tired',
      physicalCondition: 'headache',
      caffeineShots: 1,
      caffeineTime: '14:00',
      hadAlcohol: true,
      alcoholType: 'beer',
      lastMealTime: '19:00',
    };
    render(<SleepEntryForm date="2026-07-28" initialEntry={initialEntry} onSubmit={() => {}} />);

    expect(screen.getByLabelText('자려고 누운 시간')).toHaveValue('23:00');
    expect(screen.getByText('피곤함')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('머리아픔')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('음주 여부')).toBeChecked();
    expect(screen.getByText('맥주')).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/SleepEntryForm.test.tsx`
Expected: FAIL with "Cannot find module './SleepEntryForm'"

- [ ] **Step 3: Implement `SleepEntryForm.tsx`**

```tsx
// src/components/SleepEntryForm.tsx
import { FormEvent, useState } from 'react';
import { AlcoholType, OverallCondition, PhysicalCondition, SleepEntry } from '../lib/sleepTypes';
import { PixelRadioGroup } from './PixelRadioGroup';
import { PixelButton } from './PixelButton';

interface SleepEntryFormProps {
  date: string;
  initialEntry?: SleepEntry;
  onSubmit: (entry: SleepEntry) => void;
}

const OVERALL_OPTIONS: { value: OverallCondition; label: string }[] = [
  { value: 'tired', label: '피곤함' },
  { value: 'better_than_usual', label: '평소보다 개운함' },
  { value: 'refreshed', label: '개운함' },
];

const PHYSICAL_OPTIONS: { value: PhysicalCondition; label: string }[] = [
  { value: 'headache', label: '머리아픔' },
  { value: 'groggy', label: '멍함' },
  { value: 'none', label: '안아픔' },
];

const ALCOHOL_OPTIONS: { value: AlcoholType; label: string }[] = [
  { value: 'beer', label: '맥주' },
  { value: 'wine', label: '와인' },
  { value: 'soju', label: '소주' },
  { value: 'spirits', label: '양주' },
  { value: 'other', label: '기타' },
];

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
      caffeineTime: caffeineTime || undefined,
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
        options={OVERALL_OPTIONS}
        value={overallCondition}
        onChange={setOverallCondition}
      />
      <PixelRadioGroup
        legend="몸 상태"
        options={PHYSICAL_OPTIONS}
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/SleepEntryForm.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/SleepEntryForm.tsx src/components/SleepEntryForm.test.tsx
git commit -m "feat: add sleep entry form with required and optional fields"
```

---

### Task 8: Today (record) page

**Files:**
- Create: `src/pages/TodayPage.tsx`
- Create: `src/pages/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `getLocalDateString` from `src/lib/dateUtils.ts` (Task 4); `getEntry`, `saveEntry` from `src/lib/sleepStorage.ts` (Task 6); `calculateEstimatedSleepMinutes`, `formatMinutesAsDuration` from `src/lib/sleepCalc.ts` (Task 5); `SleepEntryForm` from `src/components/SleepEntryForm.tsx` (Task 7); `PixelButton` from `src/components/PixelButton.tsx` (Task 2).
- Produces: `export function TodayPage(): JSX.Element`, consumed by Task 13 (`App`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/TodayPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayPage } from './TodayPage';
import * as sleepStorage from '../lib/sleepStorage';
import * as dateUtils from '../lib/dateUtils';
import { SleepEntry } from '../lib/sleepTypes';

const TODAY = '2026-07-28';

const SAVED_ENTRY: SleepEntry = {
  date: TODAY,
  bedTime: '23:00',
  lastScreenTime: '23:30',
  wakeTime: '07:00',
  overallCondition: 'refreshed',
  physicalCondition: 'none',
  caffeineShots: 0,
  hadAlcohol: false,
};

beforeEach(() => {
  vi.spyOn(dateUtils, 'getLocalDateString').mockReturnValue(TODAY);
});

describe('TodayPage', () => {
  it('shows the entry form and a friendly prompt when no entry exists for today', () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(null);
    render(<TodayPage />);

    expect(screen.getByText(/기록해줘요/)).toBeInTheDocument();
    expect(screen.getByLabelText('기상 시간')).toBeInTheDocument();
  });

  it('shows a summary with the estimated sleep duration when today is already logged', () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(SAVED_ENTRY);
    render(<TodayPage />);

    expect(screen.getByText(/기록 완료/)).toBeInTheDocument();
    expect(screen.getByText(/7시간 30분/)).toBeInTheDocument();
    expect(screen.queryByLabelText('기상 시간')).not.toBeInTheDocument();
  });

  it('switches back to the (pre-filled) form when 수정하기 is clicked', async () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(SAVED_ENTRY);
    render(<TodayPage />);

    await userEvent.click(screen.getByText('수정하기'));

    expect(screen.getByLabelText('기상 시간')).toHaveValue('07:00');
  });

  it('saves a new entry and shows the summary after submitting the form', async () => {
    vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(null);
    const saveSpy = vi.spyOn(sleepStorage, 'saveEntry').mockImplementation(() => {});
    render(<TodayPage />);

    fireEvent.change(screen.getByLabelText('자려고 누운 시간'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('마지막으로 화면을 본 시간'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('기상 시간'), { target: { value: '07:00' } });
    await userEvent.click(screen.getByText('개운함'));
    await userEvent.click(screen.getByText('안아픔'));
    await userEvent.click(screen.getByText('기록하기'));

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ date: TODAY }));
    expect(screen.getByText(/기록 완료/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/TodayPage.test.tsx`
Expected: FAIL with "Cannot find module './TodayPage'"

- [ ] **Step 3: Implement `TodayPage.tsx`**

```tsx
// src/pages/TodayPage.tsx
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

  function handleSubmit(newEntry: SleepEntry) {
    saveEntry(newEntry);
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
      <SleepEntryForm date={today} initialEntry={entry ?? undefined} onSubmit={handleSubmit} />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/TodayPage.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/TodayPage.tsx src/pages/TodayPage.test.tsx
git commit -m "feat: add today page for recording and reviewing today's sleep entry"
```

---

### Task 9: Calendar view & day detail card

**Files:**
- Create: `src/components/CalendarView.tsx`
- Create: `src/components/CalendarView.test.tsx`
- Create: `src/components/DayDetailCard.tsx`
- Create: `src/components/DayDetailCard.test.tsx`

**Interfaces:**
- Consumes: `getDaysInMonth`, `getFirstWeekdayOfMonth` from `src/lib/dateUtils.ts` (Task 4); `SleepEntry` from `src/lib/sleepTypes.ts` (Task 4); `calculateEstimatedSleepMinutes`, `formatMinutesAsDuration` from `src/lib/sleepCalc.ts` (Task 5).
- Produces:
  ```ts
  interface CalendarViewProps {
    year: number;
    month: number; // 1-12
    entries: SleepEntry[];
    selectedDate?: string;
    onSelectDate: (date: string) => void;
  }
  export function CalendarView(props: CalendarViewProps): JSX.Element;

  interface DayDetailCardProps {
    entry: SleepEntry;
  }
  export function DayDetailCard(props: DayDetailCardProps): JSX.Element;
  ```
  Both consumed by Task 10 (`HistoryPage`).

- [ ] **Step 1: Write the failing tests for `CalendarView`**

```tsx
// src/components/CalendarView.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarView } from './CalendarView';
import { SleepEntry } from '../lib/sleepTypes';

function makeEntry(date: string, overallCondition: SleepEntry['overallCondition'] = 'refreshed'): SleepEntry {
  return {
    date,
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition,
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
  };
}

describe('CalendarView', () => {
  it('renders one button per day in the month', () => {
    render(<CalendarView year={2026} month={7} entries={[]} onSelectDate={() => {}} />);
    // July 2026 has 31 days
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('marks days that have an entry with a condition icon', () => {
    render(<CalendarView year={2026} month={7} entries={[makeEntry('2026-07-15', 'refreshed')]} onSelectDate={() => {}} />);
    const day15 = screen.getByText('15').closest('button')!;
    expect(day15.textContent).toContain('😊');
  });

  it('calls onSelectDate with the full YYYY-MM-DD when a day is clicked', async () => {
    const onSelectDate = vi.fn();
    render(<CalendarView year={2026} month={7} entries={[]} onSelectDate={onSelectDate} />);

    await userEvent.click(screen.getByText('9').closest('button')!);

    expect(onSelectDate).toHaveBeenCalledWith('2026-07-09');
  });

  it('applies the selected class to the currently selected date', () => {
    render(
      <CalendarView year={2026} month={7} entries={[]} selectedDate="2026-07-09" onSelectDate={() => {}} />
    );
    expect(screen.getByText('9').closest('button')).toHaveClass('calendar-view__day--selected');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/CalendarView.test.tsx`
Expected: FAIL with "Cannot find module './CalendarView'"

- [ ] **Step 3: Implement `CalendarView.tsx`**

```tsx
// src/components/CalendarView.tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/CalendarView.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing tests for `DayDetailCard`**

```tsx
// src/components/DayDetailCard.test.tsx
import { render, screen } from '@testing-library/react';
import { DayDetailCard } from './DayDetailCard';
import { SleepEntry } from '../lib/sleepTypes';

const BASE_ENTRY: SleepEntry = {
  date: '2026-07-28',
  bedTime: '23:00',
  lastScreenTime: '23:30',
  wakeTime: '07:00',
  overallCondition: 'refreshed',
  physicalCondition: 'none',
  caffeineShots: 0,
  hadAlcohol: false,
};

describe('DayDetailCard', () => {
  it('always shows the date, estimated duration, times, and both condition labels', () => {
    render(<DayDetailCard entry={BASE_ENTRY} />);
    expect(screen.getByText('2026-07-28')).toBeInTheDocument();
    expect(screen.getByText(/7시간 30분/)).toBeInTheDocument();
    expect(screen.getByText(/개운함/)).toBeInTheDocument();
    expect(screen.getByText(/안아픔/)).toBeInTheDocument();
  });

  it('does not show caffeine, alcohol, or meal rows when they were not recorded', () => {
    render(<DayDetailCard entry={BASE_ENTRY} />);
    expect(screen.queryByText(/카페인/)).not.toBeInTheDocument();
    expect(screen.queryByText(/음주/)).not.toBeInTheDocument();
    expect(screen.queryByText(/마지막 식사/)).not.toBeInTheDocument();
  });

  it('shows caffeine, alcohol, and meal rows when they were recorded', () => {
    const entry: SleepEntry = {
      ...BASE_ENTRY,
      caffeineShots: 2,
      caffeineTime: '14:00',
      hadAlcohol: true,
      alcoholType: 'beer',
      lastMealTime: '19:00',
    };
    render(<DayDetailCard entry={entry} />);
    expect(screen.getByText(/카페인: 2샷 \(14:00\)/)).toBeInTheDocument();
    expect(screen.getByText(/음주: 맥주/)).toBeInTheDocument();
    expect(screen.getByText(/마지막 식사: 19:00/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/components/DayDetailCard.test.tsx`
Expected: FAIL with "Cannot find module './DayDetailCard'"

- [ ] **Step 7: Implement `DayDetailCard.tsx`**

```tsx
// src/components/DayDetailCard.tsx
import { SleepEntry } from '../lib/sleepTypes';
import { calculateEstimatedSleepMinutes, formatMinutesAsDuration } from '../lib/sleepCalc';

const OVERALL_LABEL: Record<SleepEntry['overallCondition'], string> = {
  tired: '피곤함',
  better_than_usual: '평소보다 개운함',
  refreshed: '개운함',
};

const PHYSICAL_LABEL: Record<SleepEntry['physicalCondition'], string> = {
  headache: '머리아픔',
  groggy: '멍함',
  none: '안아픔',
};

const ALCOHOL_LABEL: Record<NonNullable<SleepEntry['alcoholType']>, string> = {
  beer: '맥주',
  wine: '와인',
  soju: '소주',
  spirits: '양주',
  other: '기타',
};

interface DayDetailCardProps {
  entry: SleepEntry;
}

export function DayDetailCard({ entry }: DayDetailCardProps) {
  const minutes = calculateEstimatedSleepMinutes(entry);
  return (
    <div className="word-card day-detail-card">
      <p className="day-detail-card__date">{entry.date}</p>
      <p>추정 수면 시간: {formatMinutesAsDuration(minutes)}</p>
      <p>
        취침: {entry.bedTime} · 마지막 화면: {entry.lastScreenTime} · 기상: {entry.wakeTime}
      </p>
      <p>
        컨디션: {OVERALL_LABEL[entry.overallCondition]} / {PHYSICAL_LABEL[entry.physicalCondition]}
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
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/components/DayDetailCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add src/components/CalendarView.tsx src/components/CalendarView.test.tsx src/components/DayDetailCard.tsx src/components/DayDetailCard.test.tsx
git commit -m "feat: add calendar view and day detail card components"
```

---

### Task 10: History page

**Files:**
- Create: `src/pages/HistoryPage.tsx`
- Create: `src/pages/HistoryPage.test.tsx`

**Interfaces:**
- Consumes: `getAllEntries`, `getEntry` from `src/lib/sleepStorage.ts` (Task 6); `CalendarView` from `src/components/CalendarView.tsx` (Task 9); `DayDetailCard` from `src/components/DayDetailCard.tsx` (Task 9); `PixelButton` from `src/components/PixelButton.tsx` (Task 2).
- Produces: `export function HistoryPage(): JSX.Element`, consumed by Task 13 (`App`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/HistoryPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPage } from './HistoryPage';
import * as sleepStorage from '../lib/sleepStorage';
import { SleepEntry } from '../lib/sleepTypes';

const ENTRY: SleepEntry = {
  date: '2026-07-15',
  bedTime: '23:00',
  lastScreenTime: '23:30',
  wakeTime: '07:00',
  overallCondition: 'refreshed',
  physicalCondition: 'none',
  caffeineShots: 0,
  hadAlcohol: false,
};

beforeEach(() => {
  // setSystemTime alone (without useFakeTimers) mocks only `Date`, leaving
  // setTimeout/etc. real — important because userEvent.click uses real
  // timers internally and would hang if timers were fully faked here.
  vi.setSystemTime(new Date(2026, 6, 28)); // July 28, 2026
  vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([ENTRY]);
  vi.spyOn(sleepStorage, 'getEntry').mockImplementation((date: string) => (date === ENTRY.date ? ENTRY : null));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HistoryPage', () => {
  it('shows the current month and year by default', () => {
    render(<HistoryPage />);
    expect(screen.getByText('2026년 7월')).toBeInTheDocument();
  });

  it('shows the day detail card when a logged day is selected', async () => {
    render(<HistoryPage />);
    await userEvent.click(screen.getByText('15').closest('button')!);
    expect(screen.getByText('2026-07-15')).toBeInTheDocument();
  });

  it('navigates to the previous and next month and clears the selection', async () => {
    render(<HistoryPage />);
    await userEvent.click(screen.getByText('15').closest('button')!);

    await userEvent.click(screen.getByText('◀'));
    expect(screen.getByText('2026년 6월')).toBeInTheDocument();
    expect(screen.queryByText('2026-07-15')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('▶'));
    await userEvent.click(screen.getByText('▶'));
    expect(screen.getByText('2026년 8월')).toBeInTheDocument();
  });

  it('rolls the year over when navigating past January or December', async () => {
    render(<HistoryPage />);
    for (let i = 0; i < 7; i++) {
      await userEvent.click(screen.getByText('◀'));
    }
    expect(screen.getByText('2025년 12월')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/HistoryPage.test.tsx`
Expected: FAIL with "Cannot find module './HistoryPage'"

- [ ] **Step 3: Implement `HistoryPage.tsx`**

```tsx
// src/pages/HistoryPage.tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/HistoryPage.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/HistoryPage.tsx src/pages/HistoryPage.test.tsx
git commit -m "feat: add calendar history page with month navigation"
```

---

### Task 11: Sleep statistics calculation

**Files:**
- Create: `src/lib/sleepStats.ts`
- Create: `src/lib/sleepStats.test.ts`

**Interfaces:**
- Consumes: `SleepEntry` from `src/lib/sleepTypes.ts` (Task 4); `resolveSequentialMinutes`, `calculateEstimatedSleepMinutes` from `src/lib/sleepCalc.ts` (Task 5).
- Produces:
  ```ts
  export interface BucketStat {
    label: string;
    averageScore: number;
    sampleCount: number;
  }
  export function bestSleepOnsetBucket(entries: SleepEntry[]): BucketStat | null;
  export function bestSleepDurationBucket(entries: SleepEntry[]): BucketStat | null;
  ```
  Consumed by Task 12 (`StatsPage`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sleepStats.test.ts
import { bestSleepOnsetBucket, bestSleepDurationBucket } from './sleepStats';
import { SleepEntry } from './sleepTypes';

function makeEntry(overrides: Partial<SleepEntry>): SleepEntry {
  return {
    date: '2026-07-01',
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition: 'refreshed',
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
    ...overrides,
  };
}

describe('bestSleepOnsetBucket', () => {
  it('returns null when there are no entries', () => {
    expect(bestSleepOnsetBucket([])).toBeNull();
  });

  it('picks the two-hour last-screen-time bucket with the highest average condition score', () => {
    const entries = [
      // last screen ~22:xx bucket (22시~24시), tired -> score 0
      makeEntry({ date: '2026-07-01', lastScreenTime: '22:15', overallCondition: 'tired' }),
      // last screen ~00:xx bucket (00시~02시), refreshed -> score 2 (twice)
      makeEntry({ date: '2026-07-02', bedTime: '23:50', lastScreenTime: '00:15', wakeTime: '07:00', overallCondition: 'refreshed' }),
      makeEntry({ date: '2026-07-03', bedTime: '23:50', lastScreenTime: '00:30', wakeTime: '07:00', overallCondition: 'refreshed' }),
    ];

    const result = bestSleepOnsetBucket(entries);

    expect(result).toEqual({ label: '00시~02시', averageScore: 2, sampleCount: 2 });
  });
});

describe('bestSleepDurationBucket', () => {
  it('returns null when there are no entries', () => {
    expect(bestSleepDurationBucket([])).toBeNull();
  });

  it('picks the one-hour sleep-duration bucket with the highest average condition score', () => {
    const entries = [
      // 6~7 hours, tired -> score 0
      makeEntry({ date: '2026-07-01', lastScreenTime: '00:00', wakeTime: '06:30', overallCondition: 'tired' }),
      // 7~8 hours, refreshed -> score 2
      makeEntry({ date: '2026-07-02', lastScreenTime: '00:00', wakeTime: '07:30', overallCondition: 'refreshed' }),
      // 7~8 hours, better_than_usual -> score 1
      makeEntry({ date: '2026-07-03', lastScreenTime: '00:00', wakeTime: '07:45', overallCondition: 'better_than_usual' }),
    ];

    const result = bestSleepDurationBucket(entries);

    expect(result).toEqual({ label: '7~8시간', averageScore: 1.5, sampleCount: 2 });
  });

  it('breaks ties by keeping the first-inserted bucket in entry order', () => {
    const entries = [
      makeEntry({ date: '2026-07-01', lastScreenTime: '00:00', wakeTime: '06:30', overallCondition: 'refreshed' }), // 6~7h, score 2
      makeEntry({ date: '2026-07-02', lastScreenTime: '00:00', wakeTime: '07:30', overallCondition: 'refreshed' }), // 7~8h, score 2
    ];

    expect(bestSleepDurationBucket(entries)).toEqual({ label: '6~7시간', averageScore: 2, sampleCount: 1 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/sleepStats.test.ts`
Expected: FAIL with "Cannot find module './sleepStats'"

- [ ] **Step 3: Implement `sleepStats.ts`**

```ts
// src/lib/sleepStats.ts
import { SleepEntry } from './sleepTypes';
import { calculateEstimatedSleepMinutes, resolveSequentialMinutes } from './sleepCalc';

const CONDITION_SCORE: Record<SleepEntry['overallCondition'], number> = {
  tired: 0,
  better_than_usual: 1,
  refreshed: 2,
};

export interface BucketStat {
  label: string;
  averageScore: number;
  sampleCount: number;
}

function average(nums: number[]): number {
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function pickBestBucket(groups: Map<string, number[]>): BucketStat | null {
  let best: BucketStat | null = null;
  for (const [label, scores] of groups) {
    const stat: BucketStat = { label, averageScore: average(scores), sampleCount: scores.length };
    if (!best || stat.averageScore > best.averageScore) {
      best = stat;
    }
  }
  return best;
}

export function bestSleepOnsetBucket(entries: SleepEntry[]): BucketStat | null {
  if (entries.length === 0) return null;
  const groups = new Map<string, number[]>();
  for (const entry of entries) {
    const [, lastScreenAbs] = resolveSequentialMinutes([entry.bedTime, entry.lastScreenTime, entry.wakeTime]);
    const hour = Math.floor(lastScreenAbs / 60) % 24;
    const bucketStart = Math.floor(hour / 2) * 2;
    const bucketEnd = (bucketStart + 2) % 24;
    const label = `${String(bucketStart).padStart(2, '0')}시~${String(bucketEnd).padStart(2, '0')}시`;
    const list = groups.get(label) ?? [];
    list.push(CONDITION_SCORE[entry.overallCondition]);
    groups.set(label, list);
  }
  return pickBestBucket(groups);
}

export function bestSleepDurationBucket(entries: SleepEntry[]): BucketStat | null {
  if (entries.length === 0) return null;
  const groups = new Map<string, number[]>();
  for (const entry of entries) {
    const minutes = calculateEstimatedSleepMinutes(entry);
    const hourBucket = Math.floor(minutes / 60);
    const label = `${hourBucket}~${hourBucket + 1}시간`;
    const list = groups.get(label) ?? [];
    list.push(CONDITION_SCORE[entry.overallCondition]);
    groups.set(label, list);
  }
  return pickBestBucket(groups);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/sleepStats.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sleepStats.ts src/lib/sleepStats.test.ts
git commit -m "feat: add best-sleep-window statistics calculation"
```

---

### Task 12: Statistics page

**Files:**
- Create: `src/components/StatsSummary.tsx`
- Create: `src/components/StatsSummary.test.tsx`
- Create: `src/pages/StatsPage.tsx`
- Create: `src/pages/StatsPage.test.tsx`

**Interfaces:**
- Consumes: `BucketStat`, `bestSleepOnsetBucket`, `bestSleepDurationBucket` from `src/lib/sleepStats.ts` (Task 11); `getAllEntries` from `src/lib/sleepStorage.ts` (Task 6).
- Produces:
  ```ts
  interface StatsSummaryProps {
    title: string;
    bucket: BucketStat | null;
    emptyMessage: string;
  }
  export function StatsSummary(props: StatsSummaryProps): JSX.Element;
  export function StatsPage(): JSX.Element;
  ```
  `StatsPage` is consumed by Task 13 (`App`).

- [ ] **Step 1: Write the failing tests for `StatsSummary`**

```tsx
// src/components/StatsSummary.test.tsx
import { render, screen } from '@testing-library/react';
import { StatsSummary } from './StatsSummary';

describe('StatsSummary', () => {
  it('shows the bucket label and metadata when a bucket is provided', () => {
    render(
      <StatsSummary
        title="가장 좋은 시간대"
        bucket={{ label: '22시~24시', averageScore: 1.5, sampleCount: 4 }}
        emptyMessage="데이터 부족"
      />
    );
    expect(screen.getByText('가장 좋은 시간대')).toBeInTheDocument();
    expect(screen.getByText('22시~24시')).toBeInTheDocument();
    expect(screen.getByText(/1\.5/)).toBeInTheDocument();
    expect(screen.getByText(/4개 기록/)).toBeInTheDocument();
  });

  it('shows the empty message when no bucket is available', () => {
    render(<StatsSummary title="가장 좋은 시간대" bucket={null} emptyMessage="데이터 부족" />);
    expect(screen.getByText('데이터 부족')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/StatsSummary.test.tsx`
Expected: FAIL with "Cannot find module './StatsSummary'"

- [ ] **Step 3: Implement `StatsSummary.tsx`**

```tsx
// src/components/StatsSummary.tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/StatsSummary.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing tests for `StatsPage`**

```tsx
// src/pages/StatsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { StatsPage } from './StatsPage';
import * as sleepStorage from '../lib/sleepStorage';
import { SleepEntry } from '../lib/sleepTypes';

function makeEntry(overrides: Partial<SleepEntry>): SleepEntry {
  return {
    date: '2026-07-01',
    bedTime: '23:00',
    lastScreenTime: '23:30',
    wakeTime: '07:00',
    overallCondition: 'refreshed',
    physicalCondition: 'none',
    caffeineShots: 0,
    hadAlcohol: false,
    ...overrides,
  };
}

describe('StatsPage', () => {
  it('shows a friendly empty state when there are no entries yet', () => {
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([]);
    render(<StatsPage />);
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
  });

  it('shows both statistics summaries computed from real entries', () => {
    // Same three entries as sleepStats.test.ts's bestSleepDurationBucket case,
    // reused here so the expected buckets below are already verified by Task 11's tests.
    vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([
      makeEntry({ date: '2026-07-01', lastScreenTime: '00:00', wakeTime: '06:30', overallCondition: 'tired' }),
      makeEntry({ date: '2026-07-02', lastScreenTime: '00:00', wakeTime: '07:30', overallCondition: 'refreshed' }),
      makeEntry({ date: '2026-07-03', lastScreenTime: '00:00', wakeTime: '07:45', overallCondition: 'better_than_usual' }),
    ]);
    render(<StatsPage />);

    expect(screen.getByText('가장 컨디션이 좋았던 취침 시간대')).toBeInTheDocument();
    expect(screen.getByText('가장 컨디션이 좋았던 수면 시간')).toBeInTheDocument();
    // All three share the same last-screen-time bucket (00시~02시), so it's trivially the "best".
    expect(screen.getByText('00시~02시')).toBeInTheDocument();
    // 7~8시간 (tired 0, refreshed 2 -> avg 1.5) beats 6~7시간 (tired only -> avg 0).
    expect(screen.getByText('7~8시간')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: FAIL with "Cannot find module './StatsPage'"

- [ ] **Step 7: Implement `StatsPage.tsx`**

```tsx
// src/pages/StatsPage.tsx
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
        title="가장 컨디션이 좋았던 취침 시간대"
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

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add src/components/StatsSummary.tsx src/components/StatsSummary.test.tsx src/pages/StatsPage.tsx src/pages/StatsPage.test.tsx
git commit -m "feat: add statistics page for best sleep window/duration"
```

---

### Task 13: App shell wiring, integration test & README

**Files:**
- Modify: `src/App.tsx` (replace the Task 1 placeholder)
- Modify: `src/App.test.tsx` (replace the Task 1 smoke test)
- Modify: `README.md`

**Interfaces:**
- Consumes: `TodayPage` (Task 8), `HistoryPage` (Task 10), `StatsPage` (Task 12), `PixelButton` + `PullToRefresh` (Task 2), `requestNotificationPermissionAndSync` (Task 3).
- Produces: the final `export function App()` shape the whole app boots from (`src/main.tsx`, unchanged since Task 1, renders it).

- [ ] **Step 1: Write the failing integration test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import * as sleepStorage from './lib/sleepStorage';
import * as reminder from './lib/reminder';

beforeEach(() => {
  vi.spyOn(sleepStorage, 'getEntry').mockReturnValue(null);
  vi.spyOn(sleepStorage, 'getAllEntries').mockReturnValue([]);
});

describe('App', () => {
  it('renders the title and starts on the 기록 tab', () => {
    render(<App />);
    expect(screen.getByText('잠순이 잠돌이 일기장')).toBeInTheDocument();
    expect(screen.getByLabelText('기상 시간')).toBeInTheDocument();
  });

  it('switches to the 달력 tab', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('달력'));
    expect(screen.getByText(/\d{4}년 \d{1,2}월/)).toBeInTheDocument();
  });

  it('switches to the 통계 tab', async () => {
    render(<App />);
    await userEvent.click(screen.getByText('통계'));
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
  });

  it('requests notification permission when the bell button is clicked', async () => {
    const spy = vi.spyOn(reminder, 'requestNotificationPermissionAndSync').mockResolvedValue();
    render(<App />);
    await userEvent.click(screen.getByText('🔔 알림 켜기'));
    expect(spy).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the current placeholder `App` has no tabs, so `기상 시간`/`달력`/`통계`/`🔔 알림 켜기` won't be found.

- [ ] **Step 3: Implement the final `App.tsx`**

```tsx
// src/App.tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full suite and the production build**

Run: `npm test`
Expected: PASS (all tests across every task)

Run: `npm run build`
Expected: build succeeds cleanly (icons now exist from Task 2, so no warnings).

- [ ] **Step 6: Write `README.md`**

```markdown
# 잠순이 잠돌이 일기장

매일 취침/기상 정보와 컨디션을 기록하고, 달력으로 히스토리를 보고, 어떤 시간대·수면 시간이 가장 컨디션이 좋았는지 통계로 확인하는 픽셀아트 PWA입니다.

## 로컬 개발

```bash
npm install
npm run dev
```

## 테스트

```bash
npm test
```

## 데이터 저장 방식

서버나 로그인 없이, 기록은 브라우저의 `localStorage`에만 저장됩니다 (`sleepDiary:entries` 키). 기기를 바꾸면 기록이 이전되지 않는다는 점을 감안해주세요.

## GitHub 저장소 최초 설정 (수동, 1회)

1. GitHub에 새 저장소를 만들고 이 프로젝트를 push합니다.
   ```bash
   git remote add origin <저장소 URL>
   git push -u origin main
   ```
2. 저장소 Settings > Pages 에서 Source를 "GitHub Actions"로 설정합니다.
3. main에 push되면 `Deploy to GitHub Pages` 워크플로우가 자동으로 사이트를 배포합니다.
```

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx README.md
git commit -m "feat: wire up the three-tab app shell (기록/달력/통계) with notification opt-in"
```

---

## Post-plan manual check (not a task — do after Task 13)

Run `npm run dev`, open the app, and walk through: log today's entry with all optional fields filled in, confirm the estimated duration shown matches expectations, switch to 달력 and confirm the logged day shows the right condition icon, switch to 통계 and confirm it no longer shows the empty state. This exercises the real browser `localStorage` (not mocked), which no automated test in this plan does end-to-end.
