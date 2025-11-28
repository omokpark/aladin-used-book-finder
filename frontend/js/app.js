const API_BASE_URL = 'http://localhost:3000/api';

let selectedBooks = [];
let searchResults = [];
let lastSearchData = null;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsDiv = document.getElementById('searchResults');
const selectedBooksDiv = document.getElementById('selectedBooks');
const selectedCountSpan = document.getElementById('selectedCount');
const totalPriceSpan = document.getElementById('totalPrice');
const findStoresBtn = document.getElementById('findStoresBtn');
const storeResultsDiv = document.getElementById('storeResults');
const loadingOverlay = document.getElementById('loadingOverlay');

searchBtn.addEventListener('click', searchBooks);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBooks();
  }
});

findStoresBtn.addEventListener('click', findStores);

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
    console.error('Search error:', error);
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

    bookCard.innerHTML = `
      <img src="${book.cover}" alt="${book.title}" />
      <h3>${book.title}</h3>
      <p>${book.author}</p>
      <p>${book.publisher}</p>
    `;

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
    if (selectedBooks.length >= 5) {
      alert('최대 5권까지만 선택할 수 있습니다');
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
    return;
  }

  selectedBooksDiv.innerHTML = '';

  selectedBooks.forEach((book, index) => {
    const bookItem = document.createElement('div');
    bookItem.className = 'selected-book-item';

    bookItem.innerHTML = `
      <div class="selected-book-info">
        <h4>${book.title}</h4>
        <p>${book.author} | ${book.publisher}</p>
      </div>
      <button class="remove-btn" data-index="${index}">제거</button>
    `;

    const removeBtn = bookItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => removeBook(index));

    selectedBooksDiv.appendChild(bookItem);
  });

  findStoresBtn.disabled = selectedBooks.length === 0;

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

  console.log('=== 매장 찾기 시작 ===');
  console.log('선택한 책 수:', selectedBooks.length);
  console.log('선택한 책 목록:', selectedBooks.map(b => b.title));

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
    } else {
      storeResultsDiv.innerHTML = '<p class="no-results">매장 검색 중 오류가 발생했습니다</p>';
    }
  } catch (error) {
    console.error('Find stores error:', error);
    storeResultsDiv.innerHTML = '<p class="no-results">매장 검색 중 오류가 발생했습니다</p>';
  } finally {
    loadingOverlay.classList.add('hidden');
  }
}

function displayStoreResults(data) {
  storeResultsDiv.innerHTML = '';

  // Get all stores that have at least one book from backend response
  const allStoresWithAnyBooks = data.booksWithStores
    .flatMap(book => book.stores.map(store => store.storeName))
    .filter((storeName, index, self) => self.indexOf(storeName) === index);

  // If no stores have any of the selected books at all
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
  summary.style.marginBottom = '20px';
  summary.style.padding = '15px';
  summary.style.background = '#e7f3ff';
  summary.style.borderRadius = '8px';

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
      <p style="color: #dc3545; margin-top: 10px;">아래 매장들은 선택한 책 중 일부를 보유하고 있지만 합계가 2만원 미만입니다. (배송비 별도)</p>
    `;
  }
  storeResultsDiv.appendChild(summary);

  // Create a map of store data from booksWithStores
  const storeDataMap = new Map();
  data.booksWithStores.forEach(book => {
    book.stores.forEach(store => {
      if (!storeDataMap.has(store.storeName)) {
        storeDataMap.set(store.storeName, {
          storeName: store.storeName,
          books: [],
          totalPrice: 0
        });
      }
      const storeData = storeDataMap.get(store.storeName);
      storeData.books.push({
        title: book.title,
        author: book.author,
        condition: store.condition,
        price: store.price,
        stock: store.stock,
        storeLink: store.storeLink
      });
      storeData.totalPrice += store.price;
    });
  });

  // Convert to array and sort by price
  const allStores = Array.from(storeDataMap.values())
    .sort((a, b) => b.totalPrice - a.totalPrice); // Sort by highest price first

  // Separate into free shipping and paid shipping stores
  const freeShippingStores = allStores.filter(store => store.totalPrice >= data.minTotalPrice);
  const paidShippingStores = allStores.filter(store => store.totalPrice < data.minTotalPrice);

  // Display free shipping stores first
  freeShippingStores.forEach((store, index) => {
    const storeCard = document.createElement('div');
    storeCard.className = 'store-card store-card-clickable';

    const bookListHTML = store.books.map(book => `
      <li>
        <div>
          <strong>${book.title}</strong><br/>
          <small>${book.author} | 상태: ${book.condition}</small>
        </div>
        <div style="text-align: right;">
          <strong>${book.price.toLocaleString()}원</strong><br/>
          <small>재고: ${book.stock}권</small>
        </div>
      </li>
    `).join('');

    // Get store link from the first book (all books have the same store link)
    const storeLink = store.books[0]?.storeLink || '#';
    console.log(`매장 ${store.storeName} 링크:`, storeLink);

    storeCard.innerHTML = `
      <div class="store-card-header">
        <h3>${index + 1}. ${store.storeName}</h3>
        <button class="store-link-btn" onclick="window.open('${storeLink}', '_blank'); event.stopPropagation();">
          매장 바로가기 →
        </button>
      </div>
      <p class="total-price">합계: ${store.totalPrice.toLocaleString()}원 <span style="color: #28a745;">✓ 무료배송</span></p>
      <ul class="book-list">
        ${bookListHTML}
      </ul>
    `;

    // Make entire card clickable
    storeCard.style.cursor = 'pointer';
    storeCard.addEventListener('click', () => {
      window.open(storeLink, '_blank');
    });

    storeResultsDiv.appendChild(storeCard);
  });

  // Display paid shipping stores after
  paidShippingStores.forEach((store, index) => {
    const storeCard = document.createElement('div');
    storeCard.className = 'store-card-no-free-shipping store-card-clickable';

    const bookListHTML = store.books.map(book => `
      <li>
        <div>
          <strong>${book.title}</strong><br/>
          <small>${book.author} | 상태: ${book.condition}</small>
        </div>
        <div style="text-align: right;">
          <strong>${book.price.toLocaleString()}원</strong><br/>
          <small>재고: ${book.stock}권</small>
        </div>
      </li>
    `).join('');

    // Get store link from the first book
    const storeLink = store.books[0]?.storeLink || '#';
    console.log(`매장 ${store.storeName} 링크:`, storeLink);

    storeCard.innerHTML = `
      <div class="store-card-header">
        <h3>${freeShippingStores.length + index + 1}. ${store.storeName}</h3>
        <button class="store-link-btn" onclick="window.open('${storeLink}', '_blank'); event.stopPropagation();">
          매장 바로가기 →
        </button>
      </div>
      <p class="total-price-no-shipping">합계: ${store.totalPrice.toLocaleString()}원 <span style="color: #dc3545;">+ 배송비 2,500원</span></p>
      <ul class="book-list">
        ${bookListHTML}
      </ul>
    `;

    // Make entire card clickable
    storeCard.style.cursor = 'pointer';
    storeCard.addEventListener('click', () => {
      window.open(storeLink, '_blank');
    });

    storeResultsDiv.appendChild(storeCard);
  });

  // Add button to view detailed partial results if no stores have all books
  if (data.allStoresWithBooks.length === 0 && allStoresWithAnyBooks.length > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.textAlign = 'center';
    buttonContainer.innerHTML = `
      <button class="detail-btn" id="showPartialBtn">도서별 상세 재고 내역 보기</button>
    `;
    storeResultsDiv.appendChild(buttonContainer);

    document.getElementById('showPartialBtn').addEventListener('click', () => {
      displayPartialStoreResults(data);
    });
  }
}

function displayPartialStoreResults(data) {
  storeResultsDiv.innerHTML = '';

  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  header.style.padding = '15px';
  header.style.background = '#fff3cd';
  header.style.borderRadius = '8px';
  header.style.border = '2px solid #ffc107';
  header.innerHTML = `
    <h3 style="color: #856404; margin-bottom: 10px;">📋 부분 재고 내역</h3>
    <p>선택한 책들 중 일부를 보유한 매장들의 정보입니다.</p>
  `;
  storeResultsDiv.appendChild(header);

  data.booksWithStores.forEach((book, bookIndex) => {
    const bookSection = document.createElement('div');
    bookSection.className = 'partial-book-section';

    const bookHeader = document.createElement('div');
    bookHeader.className = 'partial-book-header';

    if (book.stores.length === 0) {
      bookHeader.innerHTML = `
        <h4>${book.title}</h4>
        <p>${book.author} | ${book.publisher}</p>
        <p class="store-count no-stock">❌ 재고 없음</p>
      `;
      bookSection.appendChild(bookHeader);
      storeResultsDiv.appendChild(bookSection);
      return;
    }

    bookHeader.innerHTML = `
      <h4>${book.title}</h4>
      <p>${book.author} | ${book.publisher}</p>
      <p class="store-count">✅ ${book.stores.length}개 매장에서 판매 중</p>
    `;
    bookSection.appendChild(bookHeader);

    const storeList = document.createElement('div');
    storeList.className = 'partial-store-list';

    book.stores.forEach((store, index) => {
      const storeItem = document.createElement('div');
      storeItem.className = 'partial-store-item';
      storeItem.innerHTML = `
        <div class="store-info">
          <strong>${store.storeName}</strong>
          <span class="condition-badge">${store.condition}</span>
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
  backButton.style.marginTop = '20px';
  backButton.style.textAlign = 'center';
  backButton.innerHTML = `
    <button class="detail-btn" id="backBtn">돌아가기</button>
  `;
  storeResultsDiv.appendChild(backButton);

  document.getElementById('backBtn').addEventListener('click', () => {
    if (lastSearchData) {
      displayStoreResults(lastSearchData);
    }
  });
}
