require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const booksRouter = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.static('../frontend'));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
});

const findStoresLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: '매장 검색은 1분에 5회까지만 가능합니다.' }
});

app.use('/api/books', apiLimiter);
app.use('/api/books/find-stores', findStoresLimiter);
app.use('/api/books', booksRouter);

app.get('/', (req, res) => {
  res.send('Aladin Used Book Finder API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
