const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testCrawler2() {
  const testISBN = '9788932917245';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ISBN=${testISBN}&TabType=2`;

  console.log('Testing URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    fs.writeFileSync('debug-page.html', response.data);
    console.log('HTML saved to debug-page.html');

    const $ = cheerio.load(response.data);

    console.log('\n=== Searching for store information ===');

    console.log('\n--- Looking for rows with price (원) ---');
    $('tr').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes('원') && text.length < 200) {
        console.log(`Row ${i}:`, text.trim());
        console.log('HTML:', $(elem).html().substring(0, 200));
        console.log('---');
      }
    });

    console.log('\n--- Looking for div/span with store names ---');
    $('div, span').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes('광화문') || text.includes('강남') || text.includes('역삼') || text.includes('점')) {
        console.log(`Element: ${elem.name}, Text: ${text.substring(0, 100)}`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCrawler2();
