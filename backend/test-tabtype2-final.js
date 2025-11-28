const axios = require('axios');
const cheerio = require('cheerio');

async function testTabType2Final() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=2`;

  console.log('Testing TabType=2 - Final Structure Analysis');

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Method 1: Find by class patterns ===');

    // Look for common used book list classes
    const commonClasses = [
      '.ss_book_list',
      '.usedshop_list',
      'div[class*="prod"]',
      'div[class*="book"]',
      'div[class*="list"]',
      '.Ere_prod_list'
    ];

    commonClasses.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} with: ${selector}`);
      }
    });

    console.log('\n=== Method 2: Find elements containing store links and conditions ===');

    // Find all links to stores
    const storeLinks = $('a[href*="wshopitem"]');
    console.log(`Found ${storeLinks.length} store links`);

    // Analyze first 5 store links and their parent structure
    storeLinks.slice(0, 5).each((index, link) => {
      console.log(`\n--- Store Link ${index} ---`);
      console.log('Link text:', $(link).text().trim());
      console.log('Link href:', $(link).attr('href'));

      // Find the parent row/container
      const row = $(link).closest('tr');
      if (row.length > 0) {
        console.log('In a table row');
        const rowText = row.text().trim().replace(/\s+/g, ' ');
        console.log('Row text:', rowText.substring(0, 200));

        // Look for condition
        const cells = row.find('td');
        console.log('Number of cells:', cells.length);

        cells.each((cellIndex, cell) => {
          const cellText = $(cell).text().trim();
          if (cellText === '최상' || cellText === '상' || cellText === '중' || cellText === '하' || cellText.includes('원')) {
            console.log(`  Cell ${cellIndex}: ${cellText}`);
          }
        });
      }
    });

    console.log('\n=== Method 3: Direct condition search ===');

    // Find all TD elements with condition text
    $('td').each((index, td) => {
      const text = $(td).text().trim();
      if (text === '최상' || text === '상' || text === '중') {
        const row = $(td).closest('tr');
        const rowText = row.text().replace(/\s+/g, ' ');

        if (rowText.includes('중고매장') && rowText.includes('원')) {
          console.log('\nFound complete row with store + condition + price:');
          console.log('Condition:', text);
          console.log('Row:', rowText.substring(0, 200));

          // Try to extract all info
          const storeName = row.find('a[href*="wshopitem"]').text().trim();
          const priceMatch = rowText.match(/([\d,]+)원/);

          console.log('Extracted store:', storeName);
          console.log('Extracted price:', priceMatch ? priceMatch[1] : 'not found');
          console.log('---');
        }
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTabType2Final();
