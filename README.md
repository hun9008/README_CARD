# GitHub Dynamic Stats Card

GitHub Profile README에 삽입할 수 있는 dynamic SVG stats card 서비스입니다.
GitHub 사용자 정보를 조회해 terminal-style 카드로 렌더링합니다.

현재 버전은 Fastify + TypeScript 기반의 1차 구현으로, 다음을 지원합니다.

- GitHub username 기반 stats 조회
- SVG 카드 생성
- `terminal`, `dark`, `light` 테마 지원
- 메모리 캐시 24시간 TTL
- README embed용 이미지 응답

## Preview

아래처럼 이미지 URL로 사용할 수 있습니다.

```md
<img src="https://your-domain.com/api/github-stats?username=younghune135&theme=terminal" />
```

## Features

- Public repository count
- Last 12 months contribution count
  - GitHub token이 없으면 이 값은 fallback 집계로 표시되거나 제한될 수 있습니다.
- Language count and top languages
- Public repo star summary
- Open source ratio indicator
- Cache headers for GitHub image caching 대응
- 하루 1회 서버측 새로고침, 실패 시 stale 카드 재사용

## Tech Stack

- Node.js
- TypeScript
- Fastify
- GitHub REST API
- GitHub GraphQL API

## Project Structure

```txt
src/
  app.ts                 Fastify app and routes
  server.ts              Server entrypoint
  cache/
    memory-cache.ts      In-memory TTL cache
  github/
    client.ts            GitHub API client
    stats.ts             Stats aggregation
  render/
    svg.ts               SVG card renderer
  types.ts               Shared types
```

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Set environment variables

GitHub token은 선택 사항이지만, contribution 집계 정확도와 rate limit 안정성을 위해 권장됩니다.

```bash
export GITHUB_TOKEN=your_github_token
# or GH_TOKEN / GITHUB_PAT / GITHUB_ACCESS_TOKEN
export PORT=3000
```

### 3. Run in development

```bash
npm run dev
```

### 4. Build and run

```bash
npm run build
npm start
```

## Server Deployment with PM2

서버에서 이 프로젝트를 `git pull`로 업데이트하고 `pm2`로 프로세스를 관리하는 예시 절차입니다.

### 1. Clone on the server

```bash
git clone <your-repository-url>
cd readme_card
npm install
```

### 2. Set environment variables

배포 서버에서는 셸 프로파일이나 `pm2` 실행 명령에 환경변수를 함께 지정합니다.

```bash
export GITHUB_TOKEN=your_github_token
export PORT=3000
```

### 3. Build and start with PM2

PM2가 없다면 먼저 설치합니다.

```bash
npm install -g pm2
```

빌드 후 PM2로 실행합니다.

```bash
npm run build
pm2 start dist/server.js --name readme-card --update-env
```

상태 확인과 로그 확인:

```bash
pm2 status
pm2 logs readme-card
```

### 4. Update after `git pull`

코드를 업데이트할 때는 아래 순서로 진행하면 됩니다.

```bash
cd readme_card
git pull origin main
npm install
npm run build
pm2 restart readme-card --update-env
```

브랜치 이름이 `main`이 아니라면 해당 브랜치 이름으로 바꿔서 사용하면 됩니다.

### 5. Enable auto-start on reboot

서버 재부팅 후에도 PM2가 자동으로 올라오도록 설정할 수 있습니다.

```bash
pm2 save
pm2 startup
```

`pm2 startup` 실행 후 출력되는 마지막 명령을 한 번 더 실행해야 설정이 완료됩니다.

### 6. Health check

배포 후 서버에서 정상 동작 여부를 확인합니다.

```bash
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/github-stats?username=younghune135&theme=terminal"
```

Nginx 같은 reverse proxy를 앞단에 둘 경우, 외부에서는 해당 도메인으로 `/api/github-stats`를 연결하면 됩니다.

## API

### `GET /health`

헬스체크 엔드포인트입니다.

예시 응답:

```json
{
  "ok": true
}
```

### `GET /api/github-stats`

GitHub stats SVG를 반환합니다.

#### Query Parameters

- `username` required: GitHub username
- `theme` optional: `terminal` | `dark` | `light`

#### Example

```http
GET /api/github-stats?username=younghune135&theme=terminal
```

응답 헤더:

- `Content-Type: image/svg+xml; charset=utf-8`
- `Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600`
- `X-Cache: HIT | MISS | REFRESH | STALE | BYPASS`

## README Embed Example

```md
![GitHub Stats](https://your-domain.com/api/github-stats?username=younghune135&theme=terminal)
```

HTML 방식:

```html
<img
  src="https://your-domain.com/api/github-stats?username=younghune135&theme=terminal"
  alt="GitHub Stats Card"
/>
```

## Current Behavior

- 캐시 TTL은 24시간입니다.
- 캐시가 만료되면 다음 요청에서 한 번만 GitHub 새로고침을 시도합니다.
- 새로고침이 실패하면 마지막으로 성공한 SVG를 stale 응답으로 반환합니다.
- theme 값이 없거나 잘못되면 `terminal`로 fallback 됩니다.
- GitHub API 요청 실패 시 `502`를 반환합니다.
- `username`이 없으면 `400`을 반환합니다.

## Limitations

- Redis 같은 외부 캐시는 아직 연결되지 않았습니다.
- `hide` 파라미터는 아직 구현되지 않았습니다.
- weekly commits, heatmap summary, top repositories 같은 고급 기능은 아직 없습니다.
- 실제 프로덕션 배포 설정인 Docker, Nginx, PM2는 아직 포함되지 않았습니다.

## Verification

현재 로컬에서 확인한 항목:

- `npm install`
- `npm run build`
- Fastify `inject` 기반으로 `/health` 200 응답 확인
- `username` 누락 시 `/api/github-stats` 400 응답 확인

포트 바인딩이 제한된 실행 환경에서는 실제 listen 테스트가 막힐 수 있습니다.

## Roadmap

- `hide` 파라미터 지원
- custom theme support
- Redis cache 추가
- Docker 배포 구성
- GitHub API rate limit 대응 강화
- 더 정교한 commit and repository analytics

## License

License는 아직 지정되지 않았습니다.
