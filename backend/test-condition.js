const axios = require('axios');
const cheerio = require('cheerio');

async function testConditionField() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing Condition Field');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Looking for condition-related elements ===');

    // Check for condition badges or labels
    const storeElements = $('.Ere_store_name');
    const priceElements = $('.price');

    console.log('Total stores:', storeElements.length);

    storeElements.each((index, element) => {
      console.log(`\n--- Store ${index} ---`);
      const storeName = $(element).text().trim().replace('중고매장', '').trim();
      console.log('Store:', storeName);

      // Try to find condition near the price
      if (priceElements[index]) {
        const priceParent = $(priceElements[index]).parent();
        console.log('Price parent HTML:', priceParent.html());

        // Look for common condition indicators
        const conditionText = priceParent.find('.condition, .grade, .status, span, em').map((i, el) => {
          return $(el).text().trim();
        }).get();

        console.log('Potential condition texts:', conditionText);
      }

      // Check the entire row
      const row = $(element).closest('tr, div, li');
      console.log('Row HTML:', row.html());
    });

    // Also try to find any elements with condition-related text
    console.log('\n=== Searching for condition keywords ===');
    const bodyText = $('body').text();
    const conditionMatches = bodyText.match(/(최상|상급|중급|하급)/g);
    console.log('Condition keywords found:', conditionMatches ? [...new Set(conditionMatches)] : 'none');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConditionField();
