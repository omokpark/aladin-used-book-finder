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

## API 라우트

```
GET  /api/books/search?query=      책 검색 (알라딘 API)
GET  /api/books/detail/:isbn13     책 상세 (알라딘 API)
GET  /api/books/used-stores/:itemId  단일 책 중고매장 조회 (크롤링)
POST /api/books/find-stores        여러 책 보유 매장 검색 (크롤링)
```

## 주요 로직 흐름

1. 사용자가 책 검색 → `aladinAPI.searchBooks()` 호출
2. 최대 5권 선택 → `selectedBooks` 배열에 저장
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

작업 디렉토리: `C:\Users\lovem\aladin-used-book-finder`

### 작업 시작 시 (pull)
```bash
git pull origin main
```
GitHub 최신 코드를 받아온 후 작업을 시작합니다.

### 작업 완료 시 (commit & push)
```bash
git add 파일명        # 변경 파일 지정 (git add -A 사용 자제)
git commit -m "작업 내용 요약"
git push origin main
```
푸시 후 Render가 자동으로 재배포합니다 (약 1~2분 소요).

### 주의사항
- 작업 전 반드시 `git pull` 먼저 실행
- `.env`, `node_modules/`, `.claude/` 는 절대 커밋하지 않음 (gitignore 처리됨)
- 커밋 메시지는 변경 내용이 명확히 드러나도록 작성
