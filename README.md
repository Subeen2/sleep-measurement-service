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
