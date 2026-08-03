# AI 수면 분석 기능 — 설계 문서

**작성일:** 2026-08-03
**상태:** 승인됨 (브레인스토밍 완료)

## 1. 배경 및 목적

기존 통계 탭은 규칙 기반 계산(어느 시간대/얼마나 자야 컨디션이 좋은지, 2시간/1시간 버킷 평균)만 보여준다. 사용자가 OpenAI를 활용해 자신의 실제 기록을 더 풍부하게 해석해주는 "과학적 분석"을 원한다 — 단순 버킷 계산을 넘어, 여러 요인(카페인 섭취 시간, 화면을 끈 시간, 음주 여부 등)을 함께 고려한 개인화된 해석과 실천 제안을 받고 싶어한다.

## 2. 핵심 결정 사항

브레인스토밍 중 확정된 결정들:

1. **API 키 관리 방식:** 이 앱은 서버 없는 정적 사이트(GitHub Pages)라 클라이언트에 OpenAI 키를 절대 둘 수 없다. **별도의 얇은 서버리스 프록시(Cloudflare Workers)**를 추가해 키를 그 안에만 보관한다.
2. **분석 내용:** 일반적인 수면 상식이 아니라, **사용자 본인의 최근 14일 기록 기반 개인화된 해석**(구체적인 상관관계 1~2개 + 실천 가능한 제안 1~2개).
3. **실행 시점:** 자동 실행이 아니라 **통계 탭의 버튼 클릭 시에만** 호출 (비용 통제, YAGNI).
4. **분석 범위:** 최근 **14일** 기록만 전송 (전체 기록이 아님 — 토큰 비용, 최근 패턴에 집중).
5. **개인정보 안내:** 버튼 근처에 "최근 14일 기록이 OpenAI로 전송되어 분석됩니다" 정도의 **간단한 안내 문구만** 표시 (별도 동의 다이얼로그 없음).
6. **결과 캐싱:** 분석 결과는 `localStorage`에 캐싱해서 통계 탭 재방문 시 마지막 결과를 바로 보여준다. 재호출은 "다시 분석받기" 버튼을 명시적으로 눌렀을 때만 일어난다.

## 3. UX 흐름

통계 탭(`StatsPage`)에 기존 두 통계 카드 아래 새 카드가 추가된다:

1. **최근 14일 내 기록이 3개 미만**이면: "아직 분석할 데이터가 부족해요. 3일 이상 기록해보면 AI가 패턴을 찾아드려요 🔍" 안내만 표시, 버튼 없음.
2. **3개 이상**이면:
   - 캐시된 분석 결과가 없으면: **"🤖 AI로 분석받기"** 버튼 + 안내 문구("최근 14일 기록이 OpenAI로 전송되어 분석됩니다")
   - 캐시된 분석 결과가 있으면: 캐시된 분석 텍스트를 카드로 보여주고, 버튼 문구는 **"🔄 다시 분석받기"**로 바뀐다
   - 버튼 클릭 → 로딩 상태("분석 중이에요...") → 성공 시 결과 텍스트로 교체 + `localStorage`에 저장 → 실패 시 에러 문구("지금은 분석을 받아올 수 없어요, 잠시 후 다시 시도해주세요")를 보여주되 **기존 캐시된 결과가 있었다면 그건 그대로 유지**한다 (실패해도 이전 결과가 사라지지 않음)

미니멀 리스트(범위 밖으로 명시):
- 자동/주기적 분석 없음
- 분석 히스토리 여러 개 보관 없음 (항상 최신 1개만 캐싱)
- 스트리밍 응답 없음 (완성된 텍스트를 한 번에 받음)
- 로그인/사용자 구분 없음 (기존 앱과 동일하게 완전히 로컬 기기 단위)

## 4. 아키텍처

```
[React 앱 (GitHub Pages, 정적)]
   1. 통계 탭에서 "AI로 분석받기" 클릭
   2. localStorage에서 최근 14일 SleepEntry[] 추출
   3. Cloudflare Worker로 POST (JSON body)
        ↓
[Cloudflare Worker (별도 배포, 이 저장소의 worker/ 폴더에 코드는 함께 버전관리)]
   4. Origin 헤더 검증 (배포 주소 + localhost만 허용)
   5. OPENAI_API_KEY(Worker Secret, 코드/레포에 노출 안 됨)로 OpenAI Chat Completions 호출
   6. 분석 텍스트(plain text)를 응답으로 반환
        ↓
[React 앱]
   7. 응답 텍스트를 카드에 표시 + localStorage에 캐싱
```

**Cloudflare Workers를 선택한 이유:** 현재 정적 사이트가 GitHub Pages에 호스팅되어 있는데, Vercel/Netlify Functions는 보통 해당 플랫폼에 사이트 자체를 올리거나 최소한 연동해야 해서 지금 구조와 어긋난다. Cloudflare Workers는 GitHub Pages와 완전히 독립적으로 배포 가능하고, 무료 티어가 넉넉하며(하루 10만 요청), 가입에 신용카드가 필요 없다.

Worker 코드는 이 저장소의 `worker/sleep-analysis/` 아래에 함께 버전관리하지만, 배포는 `npm run build`/GitHub Pages 배포 파이프라인과는 완전히 분리된 별도 단계(`wrangler deploy`, 수동 1회성)로 이뤄진다.

## 5. 데이터 스키마

### 5.1 클라이언트 → Worker 요청

`VITE_SLEEP_ANALYSIS_WORKER_URL`은 Worker의 **전체 엔드포인트 URL**을 담는다 (경로를 클라이언트에서 추가로 이어붙이지 않는다 — 예: `https://sleep-analysis.<subdomain>.workers.dev`).

"최근 14일"은 **오늘을 포함해 지난 14일** (`addDays(오늘, -13)` ~ 오늘)을 의미하며, 그 범위 안에 있는 `getAllEntries()` 결과만 필터링해 보낸다. 최소 개수(3개) 판정도 이 필터링된 배열의 길이로 한다 (전체 기록 개수가 아님).

```
POST {VITE_SLEEP_ANALYSIS_WORKER_URL}
Content-Type: application/json

{
  "entries": [
    {
      "date": "2026-07-25",
      "bedTime": "23:10",
      "lastScreenTime": "23:40",
      "wakeTime": "07:00",
      "overallCondition": "refreshed",
      "physicalCondition": "none",
      "caffeineShots": 1,
      "caffeineTime": "14:30",
      "hadAlcohol": false,
      "lastMealTime": "19:30"
    },
    ...
  ]
}
```

- `entries`: 클라이언트가 이미 `getAllEntries()` + 날짜 필터(최근 14일)로 걸러서 보낸 `SleepEntry[]` (기존 `src/lib/sleepTypes.ts`의 타입 그대로, 추가 가공 없음)
- 최소 3개 미만이면 애초에 프론트에서 요청 자체를 보내지 않는다 (버튼이 숨겨져 있으므로)

### 5.2 Worker → 클라이언트 응답

**성공 (200):**
```
Content-Type: text/plain; charset=utf-8

최근 2주 기록을 보면, 자정 이후 화면을 본 날은 평균 컨디션 점수가 낮고...
(4~6문장의 한국어 분석 텍스트)
```

**실패 (4xx/5xx):** 본문 없이 상태 코드만 봐도 충분 — 클라이언트는 `res.ok`만 확인하고 실패 시 고정된 한국어 에러 문구를 보여준다 (Worker가 반환한 에러 상세를 사용자에게 그대로 노출하지 않음).

### 5.3 localStorage 캐시 스키마

```
key: "sleepDiary:aiAnalysis"
value: {
  "text": "최근 2주 기록을 보면...",
  "generatedAt": "2026-08-03T09:12:00.000Z",
  "entryDatesUsed": ["2026-07-21", "2026-07-22", ...]
}
```

- `entryDatesUsed`는 저장만 해두고 이번 범위에서는 UI에 노출하지 않는다 (디버깅/향후 확장 여지로 저장, YAGNI 원칙상 화면에 굳이 안 보여줌)

## 6. Worker 프롬프트 설계

**모델:** `gpt-4o-mini` (비용 효율적, 이 정도 패턴 분석에는 충분)

**시스템 프롬프트 (개념, Worker 코드에 하드코딩):**
> 너는 수면 과학에 밝은 친근한 톤의 어시스턴트야. 사용자가 기록한 실제 수면 데이터를 보고, 한국어 존댓말로 4~6문장 이내의 분석을 작성해. 반드시 데이터에서 뽑아낼 수 있는 구체적인 상관관계를 1~2개 짚어내고 (예: 특정 요일, 카페인 섭취 시간, 화면을 끈 시간과 컨디션의 관계), 실천 가능한 제안을 1~2개 제시해. 이모지는 최소한만 사용하고, 과장되거나 의학적 진단처럼 들리는 표현은 피해.

**유저 프롬프트:** 14일치 `entries` 배열을 그대로 JSON으로 붙여넣지 않고, Worker에서 사람이 읽기 쉬운 텍스트로 요약해 전달한다 (예: `2026-07-25: 취침 23:10, 화면 23:40, 기상 07:00, 컨디션 개운함, 카페인 1샷(14:30), 음주 없음` 형식의 줄바꿈된 목록). 이렇게 하면 토큰도 절약되고 모델이 패턴을 읽기도 더 쉽다.

## 7. 보안 / 에러 처리

- **CORS:** Worker는 `Origin` 헤더를 확인해 허용 목록(`https://subeen2.github.io`, `http://localhost:5173`)에 없으면 403을 반환한다.
- **API 키:** `OPENAI_API_KEY`는 `wrangler secret put`으로만 등록, 코드/레포/클라이언트 번들 어디에도 존재하지 않는다.
- **Worker 미설정 시 그레이스풀 비활성화:** 클라이언트는 빌드 타임 환경변수 `VITE_SLEEP_ANALYSIS_WORKER_URL`이 비어있으면 AI 분석 카드 자체를 렌더링하지 않는다 (기존 두 통계 카드는 그대로 보임). 이렇게 하면 Worker를 아직 배포하지 않은 로컬 개발/포크 환경에서도 나머지 앱이 정상 동작한다.
- **네트워크/OpenAI 오류:** 클라이언트는 실패를 사용자에게 "지금은 분석을 받아올 수 없어요, 잠시 후 다시 시도해주세요"로만 알리고, 기존에 캐시된 분석 결과가 있었다면 그대로 유지한다 (실패로 인해 이전 결과가 지워지지 않음).
- **Worker 쪽 OpenAI 실패/레이트리밋:** Worker는 OpenAI 호출이 실패하면 502를 반환하고, 상세 에러는 Worker 자체 로그(Cloudflare 대시보드)에만 남긴다.

## 8. 저장소 구조 변경 (예상)

```
in_my_dreams/
├── worker/
│   └── sleep-analysis/
│       ├── src/index.ts        (Worker 진입점 — Origin 검증 + OpenAI 호출 + 프롬프트 조립)
│       ├── wrangler.toml       (Worker 설정, OPENAI_API_KEY는 시크릿으로 별도 등록)
│       └── package.json        (Worker 전용 최소 의존성)
├── .env.example                 (신규 — VITE_SLEEP_ANALYSIS_WORKER_URL= 안내용, 실제 값은 커밋 안 함)
└── src/
    ├── lib/
    │   └── sleepAnalysis.ts    (신규 — requestSleepAnalysis(), getCachedAnalysis(), saveCachedAnalysis(), 최근 14일 필터 로직)
    └── components/
        └── AiAnalysisCard.tsx  (신규 — 버튼/로딩/결과/에러 상태를 가진 카드)
```

`StatsPage.tsx`는 `AiAnalysisCard`를 기존 두 `StatsSummary` 카드 아래에 추가로 렌더링하도록 수정된다.

## 9. 테스트 전략

- **`sleepAnalysis.ts` (Vitest):**
  - 최근 14일 필터 로직 (경계값: 정확히 14일 전 포함 여부, 미래 날짜 무시 등)
  - `requestSleepAnalysis()` — fetch를 모킹해 성공/실패(4xx, 5xx, 네트워크 에러) 케이스 검증
  - `getCachedAnalysis()`/`saveCachedAnalysis()` — localStorage 왕복, 손상된 JSON 시 안전하게 처리
- **`AiAnalysisCard.tsx` (RTL):**
  - 기록 3개 미만 → 안내 문구만, 버튼 없음
  - 캐시 없음 → "AI로 분석받기" 버튼, 클릭 → 로딩 → 성공 시 결과 표시 + 캐싱 확인
  - 캐시 있음 → 캐시된 결과 즉시 표시, 버튼 문구 "다시 분석받기"
  - 실패 시 → 에러 문구 표시, 캐시된 이전 결과는 유지
- **Worker (`worker/sleep-analysis/src/index.ts`):** 별도 자동화 테스트 프레임워크는 두지 않는다 (YAGNI — 20줄 안팎의 얇은 프록시). 대신 이 스펙을 구현하는 계획 문서에 **수동 `curl` 검증 절차**(허용된 Origin/차단된 Origin, 정상 요청, 최소 데이터 요청)를 포함한다.
- **기존 `npm test`/CI 파이프라인에는 영향 없음** — Worker는 별도 배포 흐름이라 `deploy.yml`에 포함되지 않는다.

## 10. 범위 밖 (Out of Scope)

- 자동/주기적 분석 (예: 매일 아침 자동 생성)
- 분석 결과 히스토리 여러 개 보관
- 스트리밍 응답
- 사용자별 API 키 입력 UI (이번 결정에서 제외된 대안)
- Worker에 대한 자동화 테스트 인프라
- 로그인/계정 시스템 (기존과 동일하게 기기 로컬 데이터 기준)
