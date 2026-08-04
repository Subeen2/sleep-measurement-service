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

## AI 수면 분석 기능 설정 (수동, 1회)

이 기능은 별도로 배포하는 Cloudflare Worker가 있어야 동작합니다. 없어도 나머지 앱은 정상 동작하고, AI 분석 카드만 보이지 않습니다.

1. [OpenAI API 키](https://platform.openai.com/api-keys)를 발급받습니다 (결제 수단 등록 필요).
2. [Cloudflare 계정](https://dash.cloudflare.com/sign-up)을 만듭니다 (무료, 신용카드 불필요).
3. Worker를 배포합니다.

   **포크해서 사용하는 경우:** `worker/sleep-analysis/src/index.ts`의 `ALLOWED_ORIGINS`에 있는 `https://subeen2.github.io`를 본인의 GitHub Pages 주소(`https://<your-username>.github.io`)로 바꾼 뒤 배포하세요. 그렇지 않으면 배포된 Worker가 본인 사이트의 요청을 403으로 거부합니다.
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
