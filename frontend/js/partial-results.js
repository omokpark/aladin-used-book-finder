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
    if (book.stores.length === 0) return;

    const bookSection = document.createElement('div');
    bookSection.className = 'partial-book-section';

    const bookHeader = document.createElement('div');
    bookHeader.className = 'partial-book-header';
    bookHeader.innerHTML = `
      <h4>${book.title}</h4>
      <p>${book.author} | ${book.publisher}</p>
      <p class="store-count">${book.stores.length}개 매장에서 판매 중</p>
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
    displayStoreResults(data);
  });
}
