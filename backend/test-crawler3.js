const axios = require('axios');
const cheerio = require('cheerio');

async function testStoresCrawler() {
  const testISBN = '9788932917245';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ISBN=${testISBN}&TabType=3`;

  console.log('Testing URL (TabType=3 for stores):', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Page Title ===');
    console.log($('title').text());

    console.log('\n=== Looking for store list ===');

    const stores = [];

    $('.Ere_prod_list').each((index, element) => {
      console.log(`\n--- Product List ${index} ---`);
      console.log($(element).text().trim().substring(0, 200));
    });

    $('div.Ere_prod_list, div.Ere_prod_list2').each((index, element) => {
      const $elem = $(element);
      const text = $elem.text().trim();

      console.log(`\n=== Element ${index} ===`);
      console.log('Text:', text.substring(0, 300));

      const storeName = $elem.find('.Ere_prod_storetxt').text().trim();
      const condition = $elem.find('.Ere_prod_ctxt1').text().trim();
      const priceText = $elem.find('.Ere_prod_price').text().trim();

      console.log('Store:', storeName);
      console.log('Condition:', condition);
      console.log('Price:', priceText);
    });

    console.log('\n=== Looking for specific classes ===');
    console.log('Ere_prod_storetxt:', $('.Ere_prod_storetxt').length);
    console.log('Ere_prod_ctxt1:', $('.Ere_prod_ctxt1').length);
    console.log('Ere_prod_price:', $('.Ere_prod_price').length);

    $('.Ere_prod_storetxt').each((i, elem) => {
      console.log(`Store ${i}:`, $(elem).text().trim());
    });

    $('.Ere_prod_price').each((i, elem) => {
      console.log(`Price ${i}:`, $(elem).text().trim());
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStoresCrawler();
