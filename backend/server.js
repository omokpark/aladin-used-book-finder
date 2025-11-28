require('dotenv').config();
const express = require('express');
const cors = require('cors');
const booksRouter = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

app.use('/api/books', booksRouter);

app.get('/', (req, res) => {
  res.send('Aladin Used Book Finder API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
