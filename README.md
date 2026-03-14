# 알라딘 중고책 매장 찾기

알라딘 Open API와 웹 크롤링을 활용하여 2만원 이상 무료배송 조건을 만족하는 중고책 매장을 찾아주는 웹 서비스입니다.

**서비스 URL:** https://aladin-used-book-finder.onrender.com

## 주요 기능

1. **책 검색**: 알라딘 Open API를 통해 책을 검색합니다
2. **책 선택**: 원하는 책 1~5권을 선택할 수 있습니다
3. **매장 조회**: 선택한 책들을 보유한 알라딘 중고매장을 찾아줍니다
4. **무료배송 구분**: 합계 2만원 이상(무료배송) / 미만(배송비 2,500원) 매장을 분리 표시합니다
5. **모바일 지원**: PC/모바일 환경을 감지해 적절한 알라딘 링크로 연결합니다
6. **부분 재고 내역**: 전체 보유 매장이 없을 경우 책별 부분 재고 매장을 확인할 수 있습니다

## 기술 스택

### Backend
- Node.js + Express
- Axios (HTTP 요청)
- Cheerio (웹 크롤링)
- express-rate-limit (요청 횟수 제한)
- dotenv (환경변수 관리)

### Frontend
- HTML5 / CSS3 / Vanilla JavaScript

### 배포
- GitHub → Render (자동 배포)

## 프로젝트 구조

```
aladin-used-book-finder/
├── backend/
│   ├── server.js              # Express 서버, CORS/Rate Limit 설정
│   ├── routes/
│   │   └── books.js           # API 라우트
│   ├── services/
│   │   ├── aladinAPI.js       # 알라딘 Open API 연동
│   │   └── crawler.js         # 중고매장 크롤링
│   ├── .env.example           # 환경변수 예시
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── package.json
└── README.md
```

## 설치 및 실행

### 1. 레포지토리 클론
```bash
git clone https://github.com/omokpark/aladin-used-book-finder.git
cd aladin-used-book-finder
```

### 2. 백엔드 의존성 설치
```bash
cd backend
npm install
```

### 3. 환경변수 설정
`backend/.env` 파일 생성:
```env
PORT=3000
ALADIN_API_KEY=your_ttbkey_here
ALLOWED_ORIGIN=http://localhost:3000
```

알라딘 API 키 발급: https://www.aladin.co.kr/ttb/wblog_manage.aspx

### 4. 서버 실행
```bash
npm start
# 또는 개발 모드
npm run dev
```

### 5. 브라우저 접속
```
http://localhost:3000
```

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/books/search?query={검색어}` | 책 검색 |
| GET | `/api/books/detail/:isbn13` | 책 상세 정보 |
| GET | `/api/books/used-stores/:itemId` | 단일 책 중고매장 조회 |
| POST | `/api/books/find-stores` | 여러 책 보유 매장 검색 |

### POST /api/books/find-stores
```json
{
  "books": [{ "itemId": "...", "isbn13": "...", "title": "...", "author": "..." }],
  "minTotalPrice": 20000
}
```

## Rate Limiting

무분별한 호출 방지를 위해 요청 횟수를 제한합니다:
- 전체 API: 분당 20회
- `/find-stores`: 분당 5회

## 배포 (Render)

Render 환경변수 설정:

| Key | Value |
|-----|-------|
| `ALADIN_API_KEY` | 알라딘 TTB 키 |
| `ALLOWED_ORIGIN` | `https://aladin-used-book-finder.onrender.com` |

`main` 브랜치 푸시 시 자동 배포됩니다.

## 주의사항

- 알라딘 API 키는 반드시 본인 명의로 발급받아 사용해야 합니다
- 크롤링 요청 간 500ms 지연을 두어 서버 부하를 최소화합니다
- 개인/학습 목적으로 제작된 프로젝트입니다

## 라이센스

MIT License
