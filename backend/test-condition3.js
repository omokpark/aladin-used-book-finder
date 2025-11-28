const axios = require('axios');
const cheerio = require('cheerio');

async function testConditionField() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing Condition Field - Store List Area');

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Find the main content area with store listings
    const storeElements = $('.Ere_store_name');

    console.log('\n=== Analyzing each store area ===');

    storeElements.each((index, element) => {
      if (index >= 3) return; // Just check first 3 stores

      console.log(`\n--- Store ${index} ---`);
      const storeName = $(element).text().trim().replace('중고매장', '').trim();
      console.log('Store name:', storeName);

      // Get the entire parent container
      const container = $(element).closest('.usedshop_layer, .Ere_sub_div2_preview, div');
      console.log('Container HTML:');
      console.log(container.html());
      console.log('\n---');
    });

    // Try to find unique class or structure for condition
    console.log('\n\n=== Looking for condition-related classes ===');
    $('[class*="condition"], [class*="grade"], [class*="status"], [class*="state"]').each((i, el) => {
      console.log('Found element with class:', $(el).attr('class'));
      console.log('Text:', $(el).text().trim());
      console.log('HTML:', $(el).html());
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConditionField();
