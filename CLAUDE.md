# CLAUDE.md — 알라딘 중고책 매장 찾기

Claude Code가 이 프로젝트를 파악하기 위한 컨텍스트 문서입니다.

## 프로젝트 개요

알라딘 Open API + 웹 크롤링을 결합해, 여러 책을 한 번에 구매할 수 있는 알라딘 중고매장을 찾아주는 서비스입니다.
핵심 가치: **2만원 이상 무료배송** 가능한 매장 우선 노출.

- **서비스 URL**: https://aladin-used-book-finder.onrender.com
- **GitHub**: https://github.com/omokpark/aladin-used-book-finder
- **배포**: Render (main 푸시 시 자동 배포)

## 아키텍처

```
[사용자 브라우저]
      ↓ fetch
[Express 서버 - backend/server.js]
      ↓                    ↓
[알라딘 Open API]    [알라딘 웹 크롤링]
(aladinAPI.js)       (crawler.js)
```

- 프론트엔드는 별도 서버 없이 Express가 static으로 서빙 (`../frontend`)
- 모든 API는 `/api/books/*` 경로

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `backend/server.js` | Express 진입점, CORS/Rate Limit 설정 |
| `backend/routes/books.js` | API 라우트 4개 |
| `backend/services/aladinAPI.js` | 알라딘 Open API (검색, 상세) |
| `backend/services/crawler.js` | 알라딘 중고매장 페이지 크롤링 |
| `frontend/js/app.js` | 전체 UI 로직 (검색→선택→매장조회→표시) |
| `frontend/css/style.css` | 스타일 |
| `backend/.env.example` | 환경변수 예시 |

## 환경변수 (.env)

```env
PORT=3000
ALADIN_API_KEY=알라딘_TTB_키
ALLOWED_ORIGIN=https://aladin-used-book-finder.onrender.com
```

- `ALADIN_API_KEY`: 알라딘 Open API TTB 키 (필수)
- `ALLOWED_ORIGIN`: CORS 허용 도메인 (미설정 시 localhost:3000)

## 크롤링 방식

`crawler.js`는 알라딘 중고매장 페이지를 직접 파싱합니다:

- URL: `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId={itemId}&TabType=3`
- `.Ere_store_name` → 매장명 추출
- `.price` → 가격 추출
- 책 상태(최상/상/중/하)는 **정가 대비 중고가 비율**로 추정 (실제 상태 정보 크롤링 불가)
- 요청 간 500ms 지연 적용

## 보안 설정 (2025년 3월 적용)

- **XSS 방지**: `escapeHtml()`, `safeSrc()` 함수로 API 데이터 이스케이프 처리
- **HTTPS**: 알라딘 API 호출 HTTP → HTTPS 변경
- **CORS**: `ALLOWED_ORIGIN` 환경변수로 허용 도메인 제한
- **Rate Limiting**: 전체 API 분당 20회 / `/find-stores` 분당 5회

## 보안 개발 지침 (Claude Code용)

코드를 작성하거나 수정할 때 다음 보안 원칙을 항상 준수합니다.

### 항상 확인할 취약점

| 취약점 | 이 프로젝트에서의 위험 포인트 | 대응 방법 |
|--------|-------------------------------|-----------|
| **XSS** | 알라딘 API 응답(책 제목/저자) → DOM 삽입 | `escapeHtml()` / `textContent` 사용, `innerHTML` 최소화 |
| **Command Injection** | 크롤러가 외부 URL 파라미터 사용 | URL 파라미터는 `encodeURIComponent` 처리 |
| **Open Redirect** | `storeLink`, `mobileStoreLink` 링크 클릭 | `safeSrc()`로 http/https 외 프로토콜 차단 |
| **ReDoS** | 사용자 입력 검색어 정규식 처리 시 | 복잡한 정규식 사용 금지 |
| **Prototype Pollution** | `req.body` 객체 직접 사용 | 필요한 필드만 명시적으로 추출 |

### 코드 작성 규칙

- **API 응답 데이터는 신뢰하지 않는다** — 알라딘 API/크롤링 결과도 DOM에 넣기 전 반드시 이스케이프
- **DOM 조작은 `textContent` 우선** — `innerHTML`을 써야 할 땐 이스케이프된 데이터만 사용
- **환경변수는 코드에 하드코딩 금지** — API 키, 시크릿은 반드시 `.env`에만
- **사용자 입력 검증은 프론트+백엔드 양쪽** — 프론트 검증만으로는 부족
- **새 라우트 추가 시 Rate Limiting 적용** — `server.js`의 기존 limiter 패턴 참고
- **외부 URL 링크는 `rel="noopener noreferrer"` 적용** — `target="_blank"` 사용 시 필수
- **`npm install` 전 패키지 검토** — 불필요한 의존성 추가 자제, 알려진 취약점 확인

### LocalStorage 사용 시 주의 (찜 기능 등 추가 시)

- 저장 전 데이터 크기 제한 확인 (5MB 한도)
- 저장된 데이터를 DOM에 렌더링할 때도 반드시 `escapeHtml()` 적용
- 민감 정보(API 키 등)는 절대 LocalStorage에 저장하지 않음

## API 라우트

```
GET  /api/books/search?query=      책 검색 (알라딘 API)
GET  /api/books/detail/:isbn13     책 상세 (알라딘 API)
GET  /api/books/used-stores/:itemId  단일 책 중고매장 조회 (크롤링)
POST /api/books/find-stores        여러 책 보유 매장 검색 (크롤링)
```

## 주요 로직 흐름

1. 사용자가 책 검색 → `aladinAPI.searchBooks()` 호출
2. 최대 3권 선택 → `selectedBooks` 배열에 저장
3. "매장 찾기" 클릭 → `POST /api/books/find-stores`
4. 백엔드에서 각 책마다 `getUsedBookStores(itemId)` 크롤링 (책당 500ms 대기)
5. 매장별로 보유 책 목록 집계 → 합계 2만원 이상 여부 판단
6. 프론트엔드에서 무료배송 가능/불가 매장으로 분리 표시

## 알려진 제약사항

- 책 상태(최상/상/중/하)는 실제 크롤링이 아닌 가격 비율 추정값
- 알라딘 HTML 구조 변경 시 크롤러 수정 필요
- Render 무료 플랜 사용 중 → 비활성 시 콜드 스타트 발생 (첫 요청 느림)

## 개발 시 주의사항

- `backend/.env` 파일은 gitignore 처리됨 → 로컬 실행 시 직접 생성 필요
- 프론트엔드 수정 후 별도 빌드 과정 없음 (Vanilla JS)
- GitHub `main` 브랜치 푸시 → Render 자동 배포
- 로컬에서 `cd backend && npm run dev` 로 실행

## Git 워크플로

작업 디렉토리: `C:\Users\109776\aladin-used-book-finder`

### 세션 시작 시 (반드시 순서대로)

1. **로컬을 GitHub 최신으로 동기화**
```bash
git pull origin main
```

2. **현재 상태 확인** — 미커밋 변경사항이 있으면 정리 후 작업 시작
```bash
git status
git log --oneline -5
```

3. **최근 커밋 내역 파악** — 이전 세션에서 무엇을 했는지 확인하고 작업 맥락 이어받기

4. **로컬 서버 실행** (필요 시)
```bash
cd backend && npm run dev
```

---

### 세션 마무리 시 (반드시 순서대로)

1. **변경 파일 확인**
```bash
git status
git diff
```

2. **파일별 스테이징** — `git add -A` 대신 파일명 지정
```bash
git add frontend/js/app.js
git add backend/routes/books.js
# (변경된 파일만 명시적으로 추가)
```

3. **커밋** — 변경 내용이 명확히 드러나는 메시지 작성
```bash
git commit -m "feat: 기능명 또는 fix: 버그내용"
```

4. **GitHub 푸시 → Render 자동 배포**
```bash
git push origin main
```
푸시 후 약 1~2분 후 서비스에 반영됩니다.

5. **배포 확인** — https://aladin-used-book-finder.onrender.com 에서 `Ctrl+Shift+R` 강제 새로고침으로 확인

---

### 주의사항
- `.env`, `node_modules/`, `.claude/` 는 절대 커밋하지 않음 (gitignore 처리됨)
- 커밋 전 `git status`로 의도치 않은 파일 포함 여부 반드시 확인
- CLAUDE.md의 TODO 항목은 작업 완료 시 업데이트

## TODO

- [ ] 책 상태 추정 로직 개선: 실제 크롤링으로 책 상태 정보 수집
- [ ] 크롤러 안정성 향상: 알라딘 HTML 구조 변경 감지 및 자동 업데이트 메커니즘 추가
- [ ] 배포 최적화: Render 콜드 스타트 문제 해결 (예: keep-alive 스크립트 또는 유료 플랜 고려)
- [ ] 보안 감사: 추가 취약점 검토 및 패치 (예: CSP 헤더 추가)
- [x] 프론트엔드 기능 확장: 다시 찾기(수동 찜바구니) 기능 추가 완료 (2026-03-16)
- [ ] 프론트엔드 기능 확장: 검색 필터, 정렬 옵션 등 추가
- [ ] 테스트 코드 작성: 단위 테스트 및 통합 테스트 추가
- [ ] 문서화 개선: API 문서, 사용자 가이드, 개발자 문서 작성
- [ ] 성능 최적화: 크롤링 속도 개선, 캐싱 추가
