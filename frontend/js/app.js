// 배포 환경에 따라 자동으로 API URL 설정
const API_BASE_URL = window.location.origin + '/api';

let selectedBooks = [];
let searchResults = [];
let lastSearchData = null;

// ── 모바일 탭 전환 ──────────────────────────────────────────
const SECTION_CLASSES = ['search-section', 'selected-section', 'result-section', 'saved-section'];

function goToStep(step) {
  SECTION_CLASSES.forEach((cls, i) => {
    const el = document.querySelector('.' + cls);
    if (el) el.classList.toggle('active', i + 1 === step);
  });
  document.querySelectorAll('.step-tab').forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.step) === step);
  });
  window.scrollTo(0, 0);
}

// 탭 버튼 이벤트 및 초기 활성 섹션 설정
document.querySelectorAll('.step-tab').forEach(tab => {
  tab.addEventListener('click', () => goToStep(parseInt(tab.dataset.step)));
});
// 모바일에서 첫 섹션 활성화
document.querySelector('.search-section').classList.add('active');
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
    alert(`최대 ${MAX_SAVED_QUERIES}개까지 저장할 수 있습니다.\n"다시 찾기" 탭에서 기존 조합을 삭제해주세요.`);
    goToStep(4);
    return;
  }

  const newIds = selectedBooks.map(b => b.isbn13).sort().join(',');
  const isDuplicate = queries.some(q =>
    q.books.map(b => b.isbn13).sort().join(',') === newIds
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
  alert('저장했습니다! "다시 찾기" 탭에서 확인하세요.');
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

// Universal Link 방식으로 매장 링크 열기
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

  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';

    if (selectedBooks.find(b => b.isbn13 === book.isbn13)) {
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

    bookCard.addEventListener('click', () => toggleBookSelection(book, bookCard));

    searchResultsDiv.appendChild(bookCard);
  });
}

function toggleBookSelection(book, bookCard) {
  const existingIndex = selectedBooks.findIndex(b => b.isbn13 === book.isbn13);

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

  // 탭 배지 업데이트
  const tabBadge = document.getElementById('tabBadge');
  if (tabBadge) {
    tabBadge.textContent = selectedBooks.length;
    tabBadge.classList.toggle('hidden', selectedBooks.length === 0);
  }

  if (selectedBooks.length === 0) {
    selectedBooksDiv.innerHTML = '<p class="empty-message">검색 결과에서 책을 선택해주세요</p>';
    totalPriceSpan.textContent = '0';
    findStoresBtn.disabled = true;
    saveQueryBtn.disabled = true;
    return;
  }

  const total = selectedBooks.reduce((sum, book) => sum + (book.priceStandard || 0), 0);
  totalPriceSpan.textContent = total.toLocaleString();

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
}

function removeBook(index) {
  selectedBooks.splice(index, 1);
  updateSelectedBooks();
}

function updateSearchResultsSelection() {
  const bookCards = searchResultsDiv.querySelectorAll('.book-card');

  bookCards.forEach((card, index) => {
    const book = searchResults[index];
    if (selectedBooks.find(b => b.isbn13 === book.isbn13)) {
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
      displayStoreResults(data);
      goToStep(3); // 모바일: 결과 탭으로 자동 이동 (PC는 CSS가 무시)
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
    <li>
      <div>
        <strong>${escapeHtml(book.title)}</strong><br/>
        <small>${escapeHtml(book.author)} | 상태: ${escapeHtml(book.condition)}</small>
      </div>
      <div style="text-align: right;">
        <strong>${book.price.toLocaleString()}원</strong><br/>
        <small>재고: ${book.stock}권</small>
      </div>
    </li>
  `).join('');
}

function buildStoreCard(store, label, cardClass, priceClass, priceLabel) {
  const storeCard = document.createElement('div');
  storeCard.className = `${cardClass} store-card-clickable`;

  storeCard.innerHTML = `
    <div class="store-card-header">
      <h3>${escapeHtml(label)}. ${escapeHtml(store.storeName)}</h3>
      <button class="store-link-btn">매장 바로가기 →</button>
    </div>
    <p class="${priceClass}">합계: ${store.totalPrice.toLocaleString()}원 ${priceLabel}</p>
    <button class="accordion-toggle-btn">책 목록 보기 ▼</button>
    <ul class="book-list">
      ${buildBookListHTML(store.books)}
    </ul>
  `;

  const linkBtn = storeCard.querySelector('.store-link-btn');
  linkBtn.addEventListener('click', (e) => openStoreLink(store, e));

  // 아코디언 토글 (CSS에서 모바일에만 버튼 노출)
  const accordionBtn = storeCard.querySelector('.accordion-toggle-btn');
  const bookList = storeCard.querySelector('.book-list');
  accordionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = bookList.classList.toggle('open');
    accordionBtn.textContent = isOpen ? '책 목록 접기 ▲' : '책 목록 보기 ▼';
  });

  // PC에서만 카드 전체 클릭으로 매장 이동
  if (!isMobile()) {
    storeCard.style.cursor = 'pointer';
    storeCard.addEventListener('click', () => openStoreLink(store));
  }

  return storeCard;
}

function displayStoreResults(data) {
  storeResultsDiv.innerHTML = '';

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
      <p style="color:#dc3545;margin-top:10px;">아래 매장들은 선택한 책 중 일부를 보유하고 있지만 합계가 2만원 미만입니다. (배송비 별도)</p>
    `;
  }
  storeResultsDiv.appendChild(summary);

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

  freeShippingStores.forEach((store, index) => {
    const card = buildStoreCard(
      store,
      `${index + 1}`,
      'store-card',
      'total-price',
      '<span style="color:#28a745;">✓ 무료배송</span>'
    );
    storeResultsDiv.appendChild(card);
  });

  paidShippingStores.forEach((store, index) => {
    const card = buildStoreCard(
      store,
      `${freeShippingStores.length + index + 1}`,
      'store-card-no-free-shipping',
      'total-price-no-shipping',
      '<span style="color:#dc3545;">+ 배송비 2,500원</span>'
    );
    storeResultsDiv.appendChild(card);
  });

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
  header.style.cssText = 'margin-bottom:20px;padding:15px;background:#fff3cd;border-radius:8px;border:2px solid #ffc107;';
  header.innerHTML = `
    <h3 style="color:#856404;margin-bottom:10px;">📋 부분 재고 내역</h3>
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

    book.stores.forEach((store) => {
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
      storeList.appendChild(storeItem);
    });

    bookSection.appendChild(storeList);
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
