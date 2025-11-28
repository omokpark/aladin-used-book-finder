const axios = require('axios');

const ALADIN_API_BASE_URL = 'http://www.aladin.co.kr/ttb/api';
const TTB_KEY = process.env.ALADIN_API_KEY;

async function searchBooks(query, maxResults = 20) {
  try {
    const response = await axios.get(`${ALADIN_API_BASE_URL}/ItemSearch.aspx`, {
      params: {
        ttbkey: TTB_KEY,
        Query: query,
        QueryType: 'Title',
        MaxResults: maxResults,
        start: 1,
        SearchTarget: 'Book',
        output: 'js',
        Version: '20131101'
      }
    });

    if (response.data && response.data.item) {
      return response.data.item.map(book => ({
        itemId: book.itemId,
        isbn13: book.isbn13,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        pubDate: book.pubDate,
        description: book.description,
        cover: book.cover,
        categoryName: book.categoryName,
        priceStandard: book.priceStandard,
        priceSales: book.priceSales,
        link: book.link
      }));
    }

    return [];
  } catch (error) {
    console.error('Aladin API search error:', error.message);
    throw new Error('Failed to search books from Aladin API');
  }
}

async function getBookDetail(isbn13) {
  try {
    const response = await axios.get(`${ALADIN_API_BASE_URL}/ItemLookUp.aspx`, {
      params: {
        ttbkey: TTB_KEY,
        itemIdType: 'ISBN13',
        ItemId: isbn13,
        output: 'js',
        Version: '20131101',
        OptResult: 'usedList,reviewList'
      }
    });

    if (response.data && response.data.item && response.data.item.length > 0) {
      const book = response.data.item[0];
      return {
        isbn13: book.isbn13,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        pubDate: book.pubDate,
        description: book.description,
        cover: book.cover,
        categoryName: book.categoryName,
        priceStandard: book.priceStandard,
        priceSales: book.priceSales,
        link: book.link,
        subInfo: book.subInfo
      };
    }

    return null;
  } catch (error) {
    console.error('Aladin API detail error:', error.message);
    throw new Error('Failed to get book details from Aladin API');
  }
}

module.exports = {
  searchBooks,
  getBookDetail
};
