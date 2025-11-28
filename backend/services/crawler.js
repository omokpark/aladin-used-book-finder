const axios = require('axios');
const cheerio = require('cheerio');

// 정가 대비 중고가 비율로 상태를 추정하는 함수
function estimateCondition(usedPrice, standardPrice) {
  if (!standardPrice || standardPrice === 0) {
    return '중고';
  }

  const priceRatio = (usedPrice / standardPrice) * 100;

  if (priceRatio >= 70) {
    return '최상';
  } else if (priceRatio >= 60) {
    return '상';
  } else if (priceRatio >= 50) {
    return '중';
  } else {
    return '하';
  }
}

async function getUsedBookStores(itemId, isbn13, priceStandard) {
  try {
    const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const stores = [];
    const storeElements = $('.Ere_store_name');
    const priceElements = $('.price');

    storeElements.each((index, element) => {
      const storeText = $(element).text().trim();
      const storeName = storeText.replace('중고매장', '').trim();

      // 매장 링크 추출
      const storeLink = $(element).find('a').attr('href');
      const fullStoreLink = storeLink ? `https://www.aladin.co.kr${storeLink}` : null;

      if (priceElements[index]) {
        const priceText = $(priceElements[index]).text().trim();
        const priceMatch = priceText.match(/([0-9,]+)원/);

        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, '')) || 0;

          if (price > 0 && storeName) {
            const condition = estimateCondition(price, priceStandard);
            const existingStore = stores.find(s => s.storeName === storeName);

            if (!existingStore) {
              stores.push({
                storeName,
                condition,
                price,
                stock: 1,
                storeLink: fullStoreLink
              });
            } else if (existingStore.price < price) {
              // 더 높은 가격으로 업데이트 (더 좋은 상태로 추정)
              existingStore.price = price;
              existingStore.condition = condition;
            }
          }
        }
      }
    });

    return stores;
  } catch (error) {
    console.error('Crawler error for ItemId', itemId, ':', error.message);
    return [];
  }
}

async function findStoresWithBooks(books, minTotalPrice = 20000) {
  try {
    const booksWithStores = [];

    for (const book of books) {
      const stores = await getUsedBookStores(book.itemId, book.isbn13, book.priceStandard);
      booksWithStores.push({
        ...book,
        stores
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const storeMap = new Map();

    booksWithStores.forEach((book, bookIndex) => {
      book.stores.forEach(store => {
        if (!storeMap.has(store.storeName)) {
          storeMap.set(store.storeName, {
            storeName: store.storeName,
            books: [],
            totalPrice: 0,
            hasAllBooks: true
          });
        }

        const storeData = storeMap.get(store.storeName);
        storeData.books.push({
          title: book.title,
          author: book.author,
          isbn13: book.isbn13,
          condition: store.condition,
          price: store.price,
          stock: store.stock,
          storeLink: store.storeLink
        });
      });
    });

    storeMap.forEach((storeData, storeName) => {
      if (storeData.books.length < books.length) {
        storeData.hasAllBooks = false;
      } else {
        storeData.hasAllBooks = true;
      }

      storeData.totalPrice = storeData.books.reduce((sum, book) => sum + book.price, 0);
      storeData.canFreeShipping = storeData.totalPrice >= minTotalPrice;
    });

    const allStoresWithBooks = Array.from(storeMap.values())
      .filter(store => store.hasAllBooks)
      .sort((a, b) => a.totalPrice - b.totalPrice);

    const allStoresWithAnyBooks = Array.from(storeMap.values())
      .filter(store => store.books.length > 0)
      .sort((a, b) => a.totalPrice - b.totalPrice);

    const validStores = allStoresWithAnyBooks.filter(store => store.canFreeShipping);

    return {
      requestedBooks: books.map(b => ({ title: b.title, author: b.author, isbn13: b.isbn13 })),
      validStores,
      allStoresWithBooks,
      totalStoresChecked: storeMap.size,
      booksWithStores,
      minTotalPrice
    };
  } catch (error) {
    console.error('Error finding stores with books:', error.message);
    throw new Error('Failed to find stores with all requested books');
  }
}

module.exports = {
  getUsedBookStores,
  findStoresWithBooks
};
