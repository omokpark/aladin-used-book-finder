const express = require('express');
const router = express.Router();
const { searchBooks, getBookDetail } = require('../services/aladinAPI');
const { getUsedBookStores, findStoresWithBooks } = require('../services/crawler');

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const books = await searchBooks(query);
    res.json({ success: true, books });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
});

router.get('/detail/:isbn13', async (req, res) => {
  try {
    const { isbn13 } = req.params;

    if (!isbn13) {
      return res.status(400).json({ error: 'ISBN13 is required' });
    }

    const bookDetail = await getBookDetail(isbn13);

    if (!bookDetail) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ success: true, book: bookDetail });
  } catch (error) {
    console.error('Detail error:', error);
    res.status(500).json({ error: 'Failed to get book details' });
  }
});

router.get('/used-stores/:isbn13', async (req, res) => {
  try {
    const { isbn13 } = req.params;

    if (!isbn13) {
      return res.status(400).json({ error: 'ISBN13 is required' });
    }

    const stores = await getUsedBookStores(isbn13);
    res.json({ success: true, stores });
  } catch (error) {
    console.error('Used stores error:', error);
    res.status(500).json({ error: 'Failed to get used book stores' });
  }
});

router.post('/find-stores', async (req, res) => {
  try {
    const { books, minTotalPrice } = req.body;

    console.log('\n=== 매장 찾기 요청 ===');
    console.log('받은 책 수:', books ? books.length : 0);
    console.log('책 목록:', books ? books.map(b => `${b.title} (${b.itemId})`).join(', ') : 'none');

    if (!books || !Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ error: 'Books array is required' });
    }

    if (books.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 books allowed' });
    }

    const minPrice = minTotalPrice || 20000;

    const result = await findStoresWithBooks(books, minPrice);
    console.log('찾은 매장 수:', result.allStoresWithBooks.length);
    console.log('2만원 이상 매장:', result.validStores.length);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Find stores error:', error);
    res.status(500).json({ error: 'Failed to find stores with books' });
  }
});

module.exports = router;
