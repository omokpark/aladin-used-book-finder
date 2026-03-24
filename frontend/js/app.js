// 배포 환경에 따라 자동으로 API URL 설정
const API_BASE_URL = window.location.origin + '/api';

let selectedBooks = [];
let searchResults = [];
let lastSearchData = null;
let sheetBook = null;
let sheetBookCard = null;

// ── 마지막 조회 결과 캐싱 ────────────────────────────────────────
const LAST_RESULT_KEY = 'aladinLastResult';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function saveLastResult(data) {
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({
      timestamp: Date.now(),
      selectedBooks: selectedBooks.map(b => ({
        isbn13: b.isbn13, title: b.title, author: b.author,
        cover: b.cover, itemId: b.itemId, priceStandard: b.priceStandard,
        publisher: b.publisher, link: b.link
      })),
      resultData: data
    }));
  } catch (e) {}
}

function getLastResult() {
  try {
    const cache = JSON.parse(localStorage.getItem(LAST_RESULT_KEY));
    if (!cache?.timestamp || !cache?.resultData) return null;
    if (Date.now() - cache.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(LAST_RESULT_KEY);
      return null;
    }
    return cache;
  } catch { return null; }
}
// ─────────────────────────────────────────────────────────────────

// ── 스크롤 이동 유틸리티 ──────────────────────────────────────────
function scrollToSection(sectionId) {
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
// ────────────────────────────────────────────────────────────

// ── 조회 조합 저장 (LocalStorage) ───────────────────────────
const SAVED_QUERIES_KEY = 'aladinSavedQueries';
const MAX_SAVED_QUERIES = 3;

function getSavedQueries() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVED_QUERIES_KEY));
    if (!Array.isArray(data)) return [];
    return data.filter(q => q && q.id && Array.isArray(q.books) && q.books.length > 0);
  } catch {
    return [];
  }
}

function saveCurrentQuery() {
  if (selectedBooks.length === 0) return;

  const queries = getSavedQueries();

  if (queries.length >= MAX_SAVED_QUERIES) {
    alert(`최대 ${MAX_SAVED_QUERIES}개까지 저장할 수 있습니다.\n"다시 찾기" 영역에서 기존 조합을 삭제해주세요.`);
    scrollToSection('section-saved');
    return;
  }

  const newIds = selectedBooks.map(b => b.itemId).sort().join(',');
  const isDuplicate = queries.some(q =>
    q.books.map(b => b.itemId).sort().join(',') === newIds
  );
  if (isDuplicate) {
    alert('이미 저장된 조합입니다.');
    return;
  }

  const newQuery = {
    id: Date.now().toString(),
    savedAt: new Date().toLocaleDateString('ko-KR'),
    books: selectedBooks.map(b => ({
      isbn13: b.isbn13,
      title: b.title,
      author: b.author,
      cover: b.cover,
      itemId: b.itemId,
      priceStandard: b.priceStandard,
      publisher: b.publisher
    }))
  };

  queries.push(newQuery);
  localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(queries));
  renderSavedQueries();
  alert('저장했습니다! "다시 찾기" 영역에서 확인하세요.');
  scrollToSection('section-saved');
}

function deleteSavedQuery(id) {
  const queries = getSavedQueries().filter(q => q.id !== id);
  localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(queries));
  renderSavedQueries();
}

async function runSavedQuery(query) {
  selectedBooks = [...query.books];
  updateSelectedBooks();
  await findStores();
}

function renderSavedQueries() {
  const container = document.getElementById('savedQueries');
  const countEl = document.getElementById('savedCount');
  const queries = getSavedQueries();

  if (countEl) countEl.textContent = `${queries.length}/${MAX_SAVED_QUERIES}`;

  if (queries.length === 0) {
    container.innerHTML = '<p class="empty-message">저장된 조합이 없습니다.<br>책을 선택하고 조합을 저장해보세요.</p>';
    return;
  }

  container.innerHTML = '';
  queries.forEach(query => {
    const card = document.createElement('div');
    card.className = 'saved-query-card';

    const tagsHtml = query.books
      .map(b => `<span class="saved-book-tag">${escapeHtml(b.title)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="saved-query-info">
        <div class="saved-books-list">${tagsHtml}</div>
        <p class="saved-date">저장일: ${escapeHtml(query.savedAt)}</p>
      </div>
      <div class="saved-query-actions">
        <button class="run-query-btn">조회하기</button>
        <button class="delete-query-btn">삭제</button>
      </div>
    `;

    card.querySelector('.run-query-btn').addEventListener('click', () => runSavedQuery(query));
    card.querySelector('.delete-query-btn').addEventListener('click', () => {
      if (confirm('이 조합을 삭제할까요?')) deleteSavedQuery(query.id);
    });

    container.appendChild(card);
  });
}
// ────────────────────────────────────────────────────────────

// XSS 방지: HTML 특수문자 이스케이프
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 이미지 URL 검증 (javascript: 프로토콜 차단)
function safeSrc(url) {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://') ? url : '';
}

// 모바일 감지 함수
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 적절한 링크 선택 함수
function getAppropriateLink(store) {
  const mobile = isMobile();
  const book = store.books[0];

  if (!book) return '#';

  if (mobile && book.mobileStoreLink) {
    return book.mobileStoreLink;
  }

  return book.storeLink || '#';
}

// 매장 링크 열기
function openStoreLink(store, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const book = store.books[0];
  if (!book) return;

  const mobile = isMobile();
  const mobileLink = book.mobileStoreLink;
  const pcLink = book.storeLink;

  if (mobile && mobileLink) {
    window.location.href = mobileLink;
  } else {
    window.open(pcLink || '#', '_blank');
  }
}

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsDiv = document.getElementById('searchResults');
const selectedBooksDiv = document.getElementById('selectedBooks');
const selectedCountSpan = document.getElementById('selectedCount');
const totalPriceSpan = document.getElementById('totalPrice');
const findStoresBtn = document.getElementById('findStoresBtn');
const saveQueryBtn = document.getElementById('saveQueryBtn');
const storeResultsDiv = document.getElementById('storeResults');
const loadingOverlay = document.getElementById('loadingOverlay');

searchBtn.addEventListener('click', searchBooks);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBooks();
  }
});

findStoresBtn.addEventListener('click', findStores);
saveQueryBtn.addEventListener('click', saveCurrentQuery);

// 저장된 조합 초기 렌더링
renderSavedQueries();
// 매장 결과 영역 초기화 (A/B/C)
initResultsSection();
document.getElementById('mobileOverlay').addEventListener('click', closeMobileSheet);
document.getElementById('sheetCloseBtn').addEventListener('click', closeMobileSheet);
document.getElementById('sheetAddBtn').addEventListener('click', confirmMobileBookAction);
document.getElementById('mobileBottomFindBtn').addEventListener('click', findStores);
document.getElementById('mobileBottomSaveBtn').addEventListener('click', saveCurrentQuery);
updateMobileBottomBar();

async function searchBooks() {
  const query = searchInput.value.trim();

  if (!query) {
    alert('검색어를 입력해주세요');
    return;
  }

  searchResultsDiv.innerHTML = '<p class="empty-message">검색 중...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/books/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.success && data.books.length > 0) {
      searchResults = data.books;
      displaySearchResults(data.books);
    } else {
      searchResultsDiv.innerHTML = '<p class="no-results">검색 결과가 없습니다</p>';
    }
  } catch (error) {
    searchResultsDiv.innerHTML = '<p class="no-results">검색 중 오류가 발생했습니다</p>';
  }
}

function displaySearchResults(books) {
  searchResultsDiv.innerHTML = '';

  if (storeResultsDiv.querySelector('.onboarding-card')) {
    storeResultsDiv.innerHTML = '<p class="empty-message">책을 담고 매장 찾기를 눌러주세요</p>';
  }

  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';

    if (selectedBooks.find(b => b.itemId === book.itemId)) {
      bookCard.classList.add('selected');
    }

    const img = document.createElement('img');
    img.src = safeSrc(book.cover);
    img.alt = escapeHtml(book.title);

    const h3 = document.createElement('h3');
    h3.textContent = book.title;

    const pAuthor = document.createElement('p');
    pAuthor.textContent = book.author;

    const pPublisher = document.createElement('p');
    pPublisher.textContent = book.publisher;

    bookCard.appendChild(img);
    bookCard.appendChild(h3);
    bookCard.appendChild(pAuthor);
    bookCard.appendChild(pPublisher);

    if (book.link) {
      const linkEl = document.createElement('a');
      linkEl.href = safeSrc(book.link);
      linkEl.textContent = '알라딘에서 보기';
      linkEl.className = 'book-card-link';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.addEventListener('click', e => e.stopPropagation());
      bookCard.appendChild(linkEl);
    }

    bookCard.addEventListener('click', () => toggleBookSelection(book, bookCard));

    searchResultsDiv.appendChild(bookCard);
  });
}

function toggleBookSelection(book, bookCard) {
  if (window.innerWidth <= 768) {
    openMobileSheet(book, bookCard);
    return;
  }
  const existingIndex = selectedBooks.findIndex(b => b.itemId === book.itemId);

  if (existingIndex >= 0) {
    selectedBooks.splice(existingIndex, 1);
    bookCard.classList.remove('selected');
  } else {
    if (selectedBooks.length >= 3) {
      alert('최대 3권까지만 선택할 수 있습니다');
      return;
    }
    selectedBooks.push(book);
    bookCard.classList.add('selected');
  }

  updateSelectedBooks();
}

function updateSelectedBooks() {
  selectedCountSpan.textContent = selectedBooks.length;

  if (selectedBooks.length === 0) {
    selectedBooksDiv.innerHTML = '<p class="empty-message">검색 결과에서 책을 선택해주세요</p>';
    totalPriceSpan.textContent = '0';
    findStoresBtn.disabled = true;
    saveQueryBtn.disabled = true;
    return;
  }

  const total = selectedBooks.reduce((sum, book) => sum + (book.priceStandard || 0), 0);
  const estimated = Math.round(total * 0.7);
  totalPriceSpan.textContent = estimated.toLocaleString();

  selectedBooksDiv.innerHTML = '';

  selectedBooks.forEach((book, index) => {
    const bookItem = document.createElement('div');
    bookItem.className = 'selected-book-item';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'selected-book-info';

    const h4 = document.createElement('h4');
    h4.textContent = book.title;

    const p = document.createElement('p');
    p.textContent = `${book.author} | ${book.publisher}`;

    infoDiv.appendChild(h4);
    infoDiv.appendChild(p);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '제거';
    removeBtn.addEventListener('click', () => removeBook(index));

    bookItem.appendChild(infoDiv);
    bookItem.appendChild(removeBtn);

    selectedBooksDiv.appendChild(bookItem);
  });

  findStoresBtn.disabled = selectedBooks.length === 0;
  saveQueryBtn.disabled = selectedBooks.length === 0;

  updateSearchResultsSelection();
  updateMobileBottomBar();
}

function removeBook(index) {
  selectedBooks.splice(index, 1);
  updateSelectedBooks();
}

function updateSearchResultsSelection() {
  const bookCards = searchResultsDiv.querySelectorAll('.book-card');

  bookCards.forEach((card, index) => {
    const book = searchResults[index];
    if (selectedBooks.find(b => b.itemId === book.itemId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

async function findStores() {
  if (selectedBooks.length === 0) {
    alert('최소 1권 이상의 책을 선택해주세요');
    return;
  }

  loadingOverlay.classList.remove('hidden');
  storeResultsDiv.innerHTML = '<p class="empty-message">매장을 검색하는 중입니다...</p>';
  document.getElementById('mobileBottomSaveBtn').style.display = 'none';

  try {
    const response = await fetch(`${API_BASE_URL}/books/find-stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        books: selectedBooks,
        minTotalPrice: 20000
      })
    });

    const data = await response.json();

    if (data.success) {
      lastSearchData = data;
      saveLastResult(data);
      displayStoreResults(data);
      scrollToSection('section-stores'); // 결과 영역으로 스크롤 이동
    } else {
      storeResultsDiv.innerHTML = '<p class="no-results">매장 검색 중 오류가 발생했습니다</p>';
    }
  } catch (error) {
    storeResultsDiv.innerHTML = '<p class="no-results">매장 검색 중 오류가 발생했습니다</p>';
  } finally {
    loadingOverlay.classList.add('hidden');
  }
}

function buildBookListHTML(books) {
  return books.map(book => `
    <li class="book-list-item">
      <div class="book-list-info">
        <strong>${escapeHtml(book.title)}</strong>
        <small>${escapeHtml(book.condition)} · ${book.price.toLocaleString()}원</small>
      </div>
      <span class="book-list-arrow">장바구니 →</span>
    </li>
  `).join('');
}

function buildStoreCard(store, label, cardClass, priceClass, priceLabel) {
  const storeCard = document.createElement('div');
  storeCard.className = cardClass;

  storeCard.innerHTML = `
    <div class="store-card-header">
      <h3>${escapeHtml(label)}. ${escapeHtml(store.storeName)}</h3>
    </div>
    <p class="${priceClass}">합계: ${store.totalPrice.toLocaleString()}원 ${priceLabel}</p>
    <ul class="book-list">
      ${buildBookListHTML(store.books)}
    </ul>
  `;

  // 책별 개별 링크 클릭 핸들러
  storeCard.querySelectorAll('.book-list-item').forEach((li, idx) => {
    const book = store.books[idx];
    if (!book) return;
    li.addEventListener('click', () => {
      const link = isMobile() ? book.mobileStoreLink : book.storeLink;
      if (!link) return;
      isMobile() ? (window.location.href = link) : window.open(link, '_blank');
    });
  });

  return storeCard;
}

function showLoginTipIfNeeded() {
  if (!isMobile()) return;
  if (localStorage.getItem('aladinLoginTipDismissed')) return;

  const tip = document.createElement('div');
  tip.style.cssText = 'margin-bottom:16px;padding:14px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;display:flex;gap:12px;align-items:flex-start;';
  tip.innerHTML = `
    <span style="font-size:1.3rem;flex-shrink:0;">💡</span>
    <div style="flex:1;font-size:0.9rem;color:#92400e;line-height:1.5;">
      <strong>장바구니에 바로 담으려면</strong><br>
      매장 링크를 처음 열었을 때 알라딘에 <strong>1회 로그인</strong>해두면, 이후엔 자동 로그인으로 장바구니에 바로 담을 수 있어요.
    </div>
    <button style="flex-shrink:0;background:none;border:none;color:#b45309;font-size:1.1rem;cursor:pointer;padding:0 4px;" id="loginTipDismiss">✕</button>
  `;
  tip.querySelector('#loginTipDismiss').addEventListener('click', () => {
    localStorage.setItem('aladinLoginTipDismissed', '1');
    tip.remove();
  });
  storeResultsDiv.appendChild(tip);
}

function displayStoreResults(data) {
  storeResultsDiv.innerHTML = '';

  showLoginTipIfNeeded();

  const allStoresWithAnyBooks = data.booksWithStores
    .flatMap(book => book.stores.map(store => store.storeName))
    .filter((storeName, index, self) => self.indexOf(storeName) === index);

  if (allStoresWithAnyBooks.length === 0) {
    const noResultDiv = document.createElement('div');
    noResultDiv.className = 'no-results';
    noResultDiv.innerHTML = `
      <h3>선택한 책들을 보유한 매장이 없습니다</h3>
      <p>총 ${data.totalStoresChecked}개의 매장을 확인했습니다.</p>
    `;
    storeResultsDiv.appendChild(noResultDiv);
    document.getElementById('mobileBottomSaveBtn').style.display = 'block';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-query-btn';
    saveBtn.textContent = '이 조합 저장하기 (나중에 다시 확인)';
    saveBtn.style.marginTop = '16px';
    saveBtn.addEventListener('click', saveCurrentQuery);
    storeResultsDiv.appendChild(saveBtn);
    return;
  }

  const summary = document.createElement('div');
  summary.style.cssText = 'margin-bottom:20px;padding:15px;background:#e7f3ff;border-radius:8px;';

  if (data.validStores.length > 0) {
    summary.innerHTML = `
      <p><strong>✅ 무료배송 가능 매장:</strong> ${data.validStores.length}개 (선택한 책 중 일부 조합으로 2만원 이상)</p>
      <p><strong>📚 전체 보유 매장:</strong> ${data.allStoresWithBooks.length}개</p>
      <p><strong>🔍 확인한 매장:</strong> 총 ${data.totalStoresChecked}개</p>
    `;
  } else {
    summary.innerHTML = `
      <p><strong>⚠️ 2만원 이상 매장 없음</strong></p>
      <p><strong>📚 일부 재고 보유 매장:</strong> ${allStoresWithAnyBooks.length}개 (총 ${data.totalStoresChecked}개 매장 확인)</p>
      <p style="color:#ef4444;margin-top:10px;">아래 매장들은 선택한 책 중 일부를 보유하고 있지만 합계가 2만원 미만입니다. (배송비 별도)</p>
    `;
  }
  storeResultsDiv.appendChild(summary);
  document.getElementById('mobileBottomSaveBtn').style.display = 'block';

  if (data.validStores.length === 0) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-query-btn';
    saveBtn.textContent = '이 조합 저장하기 (나중에 다시 확인)';
    saveBtn.style.marginBottom = '20px';
    saveBtn.addEventListener('click', saveCurrentQuery);
    storeResultsDiv.appendChild(saveBtn);
  }

  const storeDataMap = new Map();
  data.booksWithStores.forEach(book => {
    book.stores.forEach(store => {
      if (!storeDataMap.has(store.storeName)) {
        storeDataMap.set(store.storeName, { storeName: store.storeName, books: [], totalPrice: 0 });
      }
      const storeData = storeDataMap.get(store.storeName);
      storeData.books.push({
        title: book.title,
        author: book.author,
        condition: store.condition,
        price: store.price,
        stock: store.stock,
        storeLink: store.storeLink,
        mobileStoreLink: store.mobileStoreLink
      });
      storeData.totalPrice += store.price;
    });
  });

  const allStores = Array.from(storeDataMap.values())
    .sort((a, b) => b.totalPrice - a.totalPrice);

  const freeShippingStores = allStores.filter(store => store.totalPrice >= data.minTotalPrice);
  const paidShippingStores = allStores.filter(store => store.totalPrice < data.minTotalPrice);

  let displayedCount = 0;
  const hiddenCards = [];

  freeShippingStores.forEach((store, index) => {
    const card = buildStoreCard(
      store,
      `${index + 1}`,
      'store-card',
      'total-price',
      '<span style="color:#10b981;">✓ 무료배송</span>'
    );
    if (displayedCount >= 2) {
      card.style.display = 'none';
      hiddenCards.push(card);
    }
    storeResultsDiv.appendChild(card);
    displayedCount++;
  });

  paidShippingStores.forEach((store, index) => {
    const card = buildStoreCard(
      store,
      `${freeShippingStores.length + index + 1}`,
      'store-card-no-free-shipping',
      'total-price-no-shipping',
      '<span style="color:#ef4444;">+ 배송비 2,500원</span>'
    );
    if (displayedCount >= 2) {
      card.style.display = 'none';
      hiddenCards.push(card);
    }
    storeResultsDiv.appendChild(card);
    displayedCount++;
  });

  if (hiddenCards.length > 0) {
    const moreBtnWrap = document.createElement('div');
    moreBtnWrap.style.cssText = 'text-align:center; margin-top: 5px; margin-bottom: 30px;';
    
    const moreBtn = document.createElement('button');
    moreBtn.className = 'detail-btn';
    moreBtn.innerHTML = `모든 매장 더보기 <span style="font-weight:normal; font-size:0.95rem;">(${hiddenCards.length}개 숨김)</span> ▼`;
    
    moreBtn.addEventListener('click', () => {
      hiddenCards.forEach(c => {
        c.style.display = 'block';
        c.animate([
          { opacity: 0, transform: 'translateY(-10px)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 350, easing: 'ease-out' });
      });
      moreBtnWrap.remove();
    });
    
    moreBtnWrap.appendChild(moreBtn);
    storeResultsDiv.appendChild(moreBtnWrap);
  }

  if (data.allStoresWithBooks.length === 0 && allStoresWithAnyBooks.length > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top:20px;text-align:center;';
    buttonContainer.innerHTML = `<button class="detail-btn" id="showPartialBtn">도서별 상세 재고 내역 보기</button>`;
    storeResultsDiv.appendChild(buttonContainer);

    document.getElementById('showPartialBtn').addEventListener('click', () => {
      displayPartialStoreResults(data);
    });
  }
}

function displayPartialStoreResults(data) {
  storeResultsDiv.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:20px;padding:15px;background:#fef3c7;border-radius:8px;border:2px solid #f59e0b;';
  header.innerHTML = `
    <h3 style="color:#b45309;margin-bottom:10px;">📋 부분 재고 내역</h3>
    <p>선택한 책들 중 일부를 보유한 매장들의 정보입니다.</p>
  `;
  storeResultsDiv.appendChild(header);

  data.booksWithStores.forEach((book) => {
    const bookSection = document.createElement('div');
    bookSection.className = 'partial-book-section';

    const bookHeader = document.createElement('div');
    bookHeader.className = 'partial-book-header';

    if (book.stores.length === 0) {
      const h4 = document.createElement('h4');
      h4.textContent = book.title;
      const pMeta = document.createElement('p');
      pMeta.textContent = `${book.author} | ${book.publisher}`;
      const pStock = document.createElement('p');
      pStock.className = 'store-count no-stock';
      pStock.textContent = '❌ 재고 없음';
      bookHeader.appendChild(h4);
      bookHeader.appendChild(pMeta);
      bookHeader.appendChild(pStock);
      bookSection.appendChild(bookHeader);
      storeResultsDiv.appendChild(bookSection);
      return;
    }

    const h4 = document.createElement('h4');
    h4.textContent = book.title;
    const pMeta = document.createElement('p');
    pMeta.textContent = `${book.author} | ${book.publisher}`;
    const pCount = document.createElement('p');
    pCount.className = 'store-count';
    pCount.textContent = `✅ ${book.stores.length}개 매장에서 판매 중`;
    bookHeader.appendChild(h4);
    bookHeader.appendChild(pMeta);
    bookHeader.appendChild(pCount);
    bookSection.appendChild(bookHeader);

    const storeList = document.createElement('div');
    storeList.className = 'partial-store-list';

    const hiddenStoreItems = [];
    // 책의 컨디션(가격)이 좋은 곳을 우선 노출하기 위해 가격 내림차순 정렬
    book.stores.sort((a, b) => b.price - a.price);
    book.stores.forEach((store, idx) => {
      const storeItem = document.createElement('div');
      storeItem.className = 'partial-store-item';
      storeItem.innerHTML = `
        <div class="store-info">
          <strong>${escapeHtml(store.storeName)}</strong>
          <span class="condition-badge">${escapeHtml(store.condition)}</span>
        </div>
        <div class="price-info">
          <strong>${store.price.toLocaleString()}원</strong>
          <small>재고 ${store.stock}권</small>
        </div>
      `;
      
      if (idx >= 3) {
        storeItem.style.display = 'none';
        hiddenStoreItems.push(storeItem);
      }
      storeList.appendChild(storeItem);
    });

    bookSection.appendChild(storeList);

    if (hiddenStoreItems.length > 0) {
      const moreBtnWrap = document.createElement('div');
      moreBtnWrap.style.cssText = 'text-align:center; margin-top: 10px;';
      const moreBtn = document.createElement('button');
      moreBtn.className = 'detail-btn';
      moreBtn.style.fontSize = '0.9rem';
      moreBtn.style.padding = '8px 20px';
      moreBtn.innerHTML = `이 도서 보유 매장 더보기 (${hiddenStoreItems.length}개) ▼`;
      
      moreBtn.addEventListener('click', () => {
        hiddenStoreItems.forEach(item => {
          item.style.display = 'flex';
          item.animate([
            { opacity: 0, transform: 'translateY(-5px)' },
            { opacity: 1, transform: 'none' }
          ], { duration: 300, easing: 'ease-out' });
        });
        moreBtnWrap.remove();
      });
      moreBtnWrap.appendChild(moreBtn);
      bookSection.appendChild(moreBtnWrap);
    }

    storeResultsDiv.appendChild(bookSection);
  });

  const backButton = document.createElement('div');
  backButton.style.cssText = 'margin-top:20px;text-align:center;';
  backButton.innerHTML = `<button class="detail-btn" id="backBtn">돌아가기</button>`;
  storeResultsDiv.appendChild(backButton);

  document.getElementById('backBtn').addEventListener('click', () => {
    if (lastSearchData) {
      displayStoreResults(lastSearchData);
    }
  });
}

function openMobileSheet(book, bookCard) {
  sheetBook = book;
  sheetBookCard = bookCard;

  const coverEl = document.getElementById('sheetCover');
  coverEl.src = safeSrc(book.cover);
  coverEl.alt = escapeHtml(book.title);
  document.getElementById('sheetTitle').textContent = book.title;
  document.getElementById('sheetAuthor').textContent = book.author;
  document.getElementById('sheetPublisher').textContent = book.publisher;
  document.getElementById('sheetPrice').textContent = book.priceStandard
    ? `정가 ${book.priceStandard.toLocaleString()}원`
    : '';
  const sheetLink = document.getElementById('sheetLink');
  if (book.link) {
    sheetLink.href = safeSrc(book.link);
    sheetLink.style.display = 'block';
  } else {
    sheetLink.style.display = 'none';
  }

  const isSelected = selectedBooks.some(b => b.itemId === book.itemId);
  const isFull = selectedBooks.length >= 3 && !isSelected;
  const addBtn = document.getElementById('sheetAddBtn');

  if (isSelected) {
    addBtn.textContent = '담기 취소';
    addBtn.className = 'sheet-add-btn sheet-remove';
    addBtn.disabled = false;
    document.getElementById('sheetNote').textContent = '이미 담긴 책입니다. 취소할 수 있어요.';
  } else if (isFull) {
    addBtn.textContent = '담기';
    addBtn.className = 'sheet-add-btn';
    addBtn.disabled = true;
    document.getElementById('sheetNote').textContent = '⚠️ 최대 3권까지 담을 수 있습니다.';
  } else {
    addBtn.textContent = '담기';
    addBtn.className = 'sheet-add-btn';
    addBtn.disabled = false;
    document.getElementById('sheetNote').textContent = '이 책을 담으시겠어요?';
  }

  document.getElementById('mobileOverlay').classList.add('show');
  document.getElementById('mobileSheet').classList.add('show');
}

function closeMobileSheet() {
  document.getElementById('mobileOverlay').classList.remove('show');
  document.getElementById('mobileSheet').classList.remove('show');
  sheetBook = null;
  sheetBookCard = null;
}

function confirmMobileBookAction() {
  if (!sheetBook) return;
  const existingIndex = selectedBooks.findIndex(b => b.itemId === sheetBook.itemId);
  if (existingIndex >= 0) {
    selectedBooks.splice(existingIndex, 1);
    if (sheetBookCard) sheetBookCard.classList.remove('selected');
  } else {
    if (selectedBooks.length >= 3) return;
    selectedBooks.push(sheetBook);
    if (sheetBookCard) sheetBookCard.classList.add('selected');
  }
  updateSelectedBooks();
  closeMobileSheet();
}

function updateMobileBottomBar() {
  const chipsContainer = document.getElementById('mobileBottomChips');
  const totalEl = document.getElementById('mobileBottomTotal');
  const findBtn = document.getElementById('mobileBottomFindBtn');
  if (!chipsContainer || !totalEl || !findBtn) return;

  chipsContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const chip = document.createElement('div');
    if (selectedBooks[i]) {
      chip.className = 'mobile-chip';
      const img = document.createElement('img');
      img.src = safeSrc(selectedBooks[i].cover);
      img.alt = escapeHtml(selectedBooks[i].title);
      chip.appendChild(img);
    } else {
      chip.className = 'mobile-chip empty';
      chip.textContent = String(i + 1);
    }
    chipsContainer.appendChild(chip);
  }

  const total = selectedBooks.reduce((sum, b) => sum + (b.priceStandard || 0), 0);
  const estimated = Math.round(total * 0.7);
  totalEl.textContent = `예상 중고가 약 ${estimated.toLocaleString()}원`;

  if (selectedBooks.length === 0) {
    findBtn.textContent = '책을 선택해주세요';
    findBtn.disabled = true;
  } else {
    findBtn.textContent = `매장 찾기 (${selectedBooks.length}권)`;
    findBtn.disabled = false;
  }
}

// ── 매장 결과 영역 초기 상태 (A/B/C) ────────────────────────────
function initResultsSection() {
  const cache = getLastResult();
  const savedQueries = getSavedQueries();

  if (cache) {
    showCachedResults(cache);
  } else if (savedQueries.length > 0) {
    showSavedQueriesInResults(savedQueries);
  } else {
    showOnboarding();
  }
}

function showOnboarding() {
  storeResultsDiv.innerHTML = `
    <div class="onboarding-card">
      <p class="onboarding-desc">배송료없는 중고매장을 한번에 찾아드립니다!!</p>
      <p class="onboarding-sub">원하는 조합을 저장해두세요. 편하게 다시 찾을 수 있어요.</p>
      <div class="onboarding-steps">
        <div class="onboarding-step">
          <div class="onboarding-step-icon">📚</div>
          <div class="onboarding-step-text">책 검색</div>
        </div>
        <div class="onboarding-arrow">→</div>
        <div class="onboarding-step">
          <div class="onboarding-step-icon">✅</div>
          <div class="onboarding-step-text">최대 3권 담기</div>
        </div>
        <div class="onboarding-arrow">→</div>
        <div class="onboarding-step">
          <div class="onboarding-step-icon">🏪</div>
          <div class="onboarding-step-text">매장 찾기</div>
        </div>
      </div>
    </div>
  `;
}

function showSavedQueriesInResults(queries) {
  storeResultsDiv.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'results-saved-header';
  header.textContent = '저장해둔 조합이 있어요. 바로 조회해보세요.';
  storeResultsDiv.appendChild(header);

  queries.forEach(query => {
    const card = document.createElement('div');
    card.className = 'results-saved-card';

    const tagsHtml = query.books
      .map(b => `<span class="saved-book-tag">${escapeHtml(b.title)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="saved-query-info">
        <div class="saved-books-list">${tagsHtml}</div>
        <p class="saved-date">저장일: ${escapeHtml(query.savedAt)}</p>
      </div>
      <div class="saved-query-actions">
        <button class="run-query-btn">조회하기</button>
        <button class="delete-query-btn">삭제</button>
      </div>
    `;

    card.querySelector('.run-query-btn').addEventListener('click', () => runSavedQuery(query));
    card.querySelector('.delete-query-btn').addEventListener('click', () => {
      if (confirm('이 조합을 삭제할까요?')) {
        deleteSavedQuery(query.id);
        const remaining = getSavedQueries();
        if (remaining.length > 0) {
          showSavedQueriesInResults(remaining);
        } else {
          showOnboarding();
        }
      }
    });
    storeResultsDiv.appendChild(card);
  });
}

function showCachedResults(cache) {
  const daysAgo = Math.floor((Date.now() - cache.timestamp) / (24 * 60 * 60 * 1000));
  const timeText = daysAgo === 0 ? '오늘' : `${daysAgo}일 전`;

  selectedBooks = [...cache.selectedBooks];
  updateSelectedBooks();
  lastSearchData = cache.resultData;
  displayStoreResults(cache.resultData);

  const banner = document.createElement('div');
  banner.className = 'cache-banner';
  banner.innerHTML = `
    <span>🕐 ${timeText} 조회 결과입니다. 재고가 변동되었을 수 있습니다.</span>
    <button class="cache-refresh-btn" id="cacheRefreshBtn">다시 조회</button>
  `;
  storeResultsDiv.insertBefore(banner, storeResultsDiv.firstChild);
  document.getElementById('cacheRefreshBtn').addEventListener('click', findStores);
}
// ─────────────────────────────────────────────────────────────────
