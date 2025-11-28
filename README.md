# 알라딘 중고책 매장 찾기

알라딘 Open API와 웹 크롤링을 활용하여 2만원 이상 무료배송 조건을 만족하는 중고책 매장을 찾아주는 웹 서비스입니다.

## 주요 기능

1. **책 검색**: 알라딘 Open API를 통해 책을 검색합니다
2. **책 선택**: 원하는 책 1-5권을 선택할 수 있습니다
3. **매장 조회**: 선택한 모든 책이 있고, 합계 금액이 2만원 이상인 알라딘 중고매장을 찾아줍니다
4. **결과 표시**: 조건을 만족하는 매장 목록과 각 매장의 책 가격 정보를 제공합니다

## 기술 스택

### Backend
- Node.js
- Express
- Axios (API 호출)
- Cheerio (웹 크롤링)
- dotenv (환경변수 관리)

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

## 설치 및 실행

### 1. 프로젝트 클론
```bash
cd aladin-used-book-finder
```

### 2. 백엔드 설정

```bash
cd backend
npm install
```

### 3. 환경변수 설정

`.env` 파일을 생성하고 알라딘 API 키를 입력합니다:

```env
PORT=3000
ALADIN_API_KEY=your_ttbkey_here
```

**알라딘 API 키 발급 방법:**
1. [알라딘 Open API](https://www.aladin.co.kr/ttb/wblog_manage.aspx) 페이지 방문
2. 회원가입 및 로그인
3. TTBKey 발급받기

### 4. 서버 실행

```bash
npm start
```

개발 모드 (nodemon 사용):
```bash
npm run dev
```

### 5. 웹 브라우저에서 접속

```
http://localhost:3000
```

## 사용 방법

1. **책 검색**: 검색창에 책 제목을 입력하고 검색 버튼을 클릭합니다
2. **책 선택**: 검색 결과에서 원하는 책을 클릭하여 선택합니다 (최대 5권)
3. **매장 찾기**: "매장 찾기" 버튼을 클릭합니다
4. **결과 확인**: 조건을 만족하는 매장 목록과 각 매장의 책 가격, 상태, 재고 정보를 확인합니다

## API 엔드포인트

### 책 검색
```
GET /api/books/search?query={검색어}
```

### 책 상세 정보
```
GET /api/books/detail/:isbn13
```

### 중고 매장 재고 조회
```
GET /api/books/used-stores/:isbn13
```

### 조건에 맞는 매장 찾기
```
POST /api/books/find-stores
Body: {
  books: [{ isbn13, title, author, ... }],
  minTotalPrice: 20000
}
```

## 프로젝트 구조

```
aladin-used-book-finder/
├── backend/
│   ├── server.js              # Express 서버
│   ├── routes/
│   │   └── books.js           # 책 관련 API 라우트
│   ├── services/
│   │   ├── aladinAPI.js       # 알라딘 API 호출 로직
│   │   └── crawler.js         # 중고매장 크롤링 로직
│   ├── package.json
│   └── .env                   # 환경변수 (gitignore)
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── README.md
```

## 주의사항

1. **알라딘 API 키**: 반드시 본인의 알라딘 API 키를 발급받아 사용해야 합니다
2. **크롤링 제한**: 웹 크롤링은 알라딘 서버에 부하를 줄 수 있으므로, 요청 간 적절한 지연(500ms)을 두고 있습니다
3. **로봇 배제 표준**: 알라딘의 robots.txt를 준수하며 사용해야 합니다
4. **개인 프로젝트**: 이 프로젝트는 학습 및 개인 사용 목적으로 제작되었습니다

## 개선 가능 사항

- [ ] 로딩 상태 개선 (진행률 표시)
- [ ] 책 상세 정보 모달 추가
- [ ] 매장 위치 지도 표시
- [ ] 책 가격 정렬 옵션
- [ ] 최근 검색 기록 저장
- [ ] Puppeteer를 사용한 고급 크롤링 (동적 콘텐츠 지원)
- [ ] 에러 핸들링 강화
- [ ] 캐싱 시스템 도입

## 라이센스

MIT License

## 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
