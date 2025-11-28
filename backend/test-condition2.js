const axios = require('axios');
const cheerio = require('cheerio');

async function testConditionField() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing Condition Field - Detailed');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Find all table rows or list items that contain store information
    console.log('\n=== Searching for table structure ===');

    $('tr').each((index, row) => {
      const rowText = $(row).text();
      if (rowText.includes('중고매장') || rowText.includes('원')) {
        console.log(`\n--- Row ${index} ---`);
        console.log('Row HTML:', $(row).html());
      }
    });

    // Look for all elements containing condition keywords
    console.log('\n\n=== Elements with condition keywords ===');
    $('*').each((index, element) => {
      const text = $(element).text().trim();
      if (text === '최상' || text === '상급' || text === '중급' || text === '하급') {
        console.log('\nFound condition:', text);
        console.log('Element:', $(element).prop('tagName'));
        console.log('Class:', $(element).attr('class'));
        console.log('Parent HTML:', $(element).parent().html());
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConditionField();
