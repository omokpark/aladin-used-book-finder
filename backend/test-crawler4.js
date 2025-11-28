const axios = require('axios');
const cheerio = require('cheerio');

async function testWithItemId() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing URL with ItemId:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Page Title ===');
    console.log($('title').text().trim());

    console.log('\n=== Looking for all divs with class containing "prod" ===');
    $('[class*="prod"]').each((i, elem) => {
      const className = $(elem).attr('class');
      if (className && i < 20) {
        console.log(`Class: ${className}, Text: ${$(elem).text().trim().substring(0, 80)}`);
      }
    });

    console.log('\n=== Looking for price elements ===');
    $('[class*="price"], [class*="Price"]').each((i, elem) => {
      const className = $(elem).attr('class');
      const text = $(elem).text().trim();
      if (text.includes('원')) {
        console.log(`Price element: class="${className}", text="${text}"`);
      }
    });

    console.log('\n=== Looking for store/shop elements ===');
    $('[class*="store"], [class*="shop"], [class*="Store"], [class*="Shop"]').each((i, elem) => {
      const className = $(elem).attr('class');
      const text = $(elem).text().trim();
      if (text.length > 0 && text.length < 100) {
        console.log(`Store element: class="${className}", text="${text}"`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWithItemId();
