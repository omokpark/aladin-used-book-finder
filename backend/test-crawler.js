const axios = require('axios');
const cheerio = require('cheerio');

async function testCrawler() {
  const testISBN = '9788932917245';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ISBN=${testISBN}&TabType=2`;

  console.log('Testing URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Page Title ===');
    console.log($('title').text());

    console.log('\n=== Looking for tables ===');
    $('table').each((i, elem) => {
      const className = $(elem).attr('class');
      console.log(`Table ${i}: class="${className}"`);
    });

    console.log('\n=== Looking for usedshop_off table ===');
    const usedshopTable = $('table.usedshop_off');
    console.log('Found usedshop_off tables:', usedshopTable.length);

    console.log('\n=== All table rows ===');
    $('table tr').each((i, elem) => {
      const text = $(elem).text().trim().substring(0, 100);
      if (text) {
        console.log(`Row ${i}: ${text}`);
      }
    });

    console.log('\n=== Looking for alternative selectors ===');
    console.log('div.usedshop_off:', $('div.usedshop_off').length);
    console.log('.Ere_prod_list:', $('.Ere_prod_list').length);
    console.log('.shop_list:', $('.shop_list').length);

    console.log('\n=== First 500 characters of body ===');
    console.log($('body').text().trim().substring(0, 500));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCrawler();
