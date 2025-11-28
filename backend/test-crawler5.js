const axios = require('axios');
const cheerio = require('cheerio');

async function testRealCrawler() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing Real Crawler Logic');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const stores = [];
    const storeElements = $('.Ere_store_name');
    const priceElements = $('.price');

    console.log('\n=== Found Elements ===');
    console.log('Store elements:', storeElements.length);
    console.log('Price elements:', priceElements.length);

    storeElements.each((index, element) => {
      const storeText = $(element).text().trim();
      const storeName = storeText.replace('중고매장', '').trim();

      console.log(`\n--- Store ${index} ---`);
      console.log('Raw store text:', storeText);
      console.log('Cleaned store name:', storeName);

      if (priceElements[index]) {
        const priceText = $(priceElements[index]).text().trim();
        console.log('Price text:', priceText);

        const priceMatch = priceText.match(/([0-9,]+)원/);
        console.log('Price match:', priceMatch);

        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
          console.log('Parsed price:', price);

          if (price > 0 && storeName) {
            const existingStore = stores.find(s => s.storeName === storeName);
            if (!existingStore) {
              stores.push({
                storeName,
                condition: '중고',
                price,
                stock: 1
              });
              console.log('✓ Added to stores');
            } else {
              console.log('✗ Duplicate store, skipped');
            }
          }
        }
      } else {
        console.log('✗ No corresponding price element');
      }
    });

    console.log('\n=== Final Result ===');
    console.log('Total unique stores found:', stores.length);
    console.log(JSON.stringify(stores, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRealCrawler();
