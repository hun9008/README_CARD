# GitHub Dynamic Stats Card 개발 계획서

## 1. 프로젝트 개요
GitHub Profile README에서 사용할 Custom Dynamic Stats Card 서비스를 개발한다.

기존 github-readme-stats와 유사하게 외부 이미지 URL을 GitHub README에 삽입하고,
서버에서 동적으로 SVG 이미지를 생성하여 사용자별 GitHub 활동 정보를 시각적으로 제공한다.

본 서비스는 terminal-style UI 기반의 custom stats visualization 제공을 목표로 한다.

---

## 2. 개발 목표

### Functional Goals
- GitHub username 기반 stats 조회
- Dynamic SVG card 생성
- GitHub README embed 지원
- Cache 적용

### Non-functional Goals
- Low latency (<500ms with cache)
- GitHub API rate limit 대응
- High availability
- Lightweight architecture

---

## 3. 제공 기능

### Basic Stats
- Repository count
- Commit count
- Language count
- Open source contribution ratio

예시 출력:
repos       494          ████████████████████░  since 2024
commits     1,081        ██████████░░░░░░░░░░░  last year
langs       4            Python · TS · Go · Elixir
open src    100%         all public, all open

### Advanced Stats (Optional)
- Recent activity
- Weekly commits
- Contribution heatmap summary
- Top repositories
- Custom badges

### Theme Support
- Dark
- Light
- Terminal
- Custom theme

---

## 4. 시스템 아키텍처

GitHub README
    ↓
Custom Stats API Server
    ↓
GitHub REST API / GraphQL API
    ↓
Stats Aggregation Layer
    ↓
SVG Renderer

---

## 5. 기술 스택

### Backend
- Node.js
- TypeScript
- Express / Fastify

### API
- GitHub REST API
- GitHub GraphQL API

### Cache
- Redis (optional)
- Memory Cache

### Infra
- Docker
- PM2 / Kubernetes
- Nginx Reverse Proxy

### Monitoring
- Prometheus
- Grafana

---

## 6. API 설계

### Endpoint
GET /api/github-stats

### Query Parameters
- username
- theme
- hide

예시:
GET /api/github-stats?username=younghune135&theme=terminal

---

## 7. 주요 모듈 설계

### GitHub API Client
역할:
- Repository 조회
- Commit 조회
- Language 통계 조회

### Stats Aggregator
역할:
- Raw GitHub Data 정제
- 통계 계산
- Cache 적용

예시:
{
  "repos": 50,
  "commits": 1280,
  "languages": ["Python", "Java", "TypeScript"]
}

### SVG Renderer
역할:
- 통계 데이터를 SVG card로 변환

출력:
<svg>...</svg>

---

## 8. 캐싱 전략

### 목적
- API Rate Limit 방지
- Response latency 감소

### 정책
- Cache TTL: 1 hour
- Cold miss → GitHub API 호출
- Hit → cached SVG 반환

---

## 9. 배포 전략

### Local
- Docker Compose

### Production
- VPS / Cloud Server
- Nginx + PM2

예시:
stats.yourdomain.com

---

## 10. README 적용 방식

Markdown:
<img src="https://stats.yourdomain.com/api/github-stats?username=younghune135" />

GitHub Profile README에서 자동 렌더링된다.

---

## 11. 개발 일정

### Phase 1
- API 설계
- GitHub API 연동

### Phase 2
- Stats Aggregation
- SVG Renderer 개발

### Phase 3
- Cache 적용
- 배포

### Phase 4
- Theme 지원
- 고급 기능 추가

---

## 12. 예상 이슈

### GitHub API Rate Limit
해결:
- Cache
- GraphQL 최적화

### GitHub Image Cache
해결:
- Cache-Control header
- 일정 주기 갱신

### Commit Count 계산 비용
해결:
- Background aggregation
- Lazy loading

---

## 13. 기대 효과
- GitHub Profile 시각적 개선
- 개발자 브랜딩 강화
- Custom stats visualization 가능
- Open source project로 확장 가능