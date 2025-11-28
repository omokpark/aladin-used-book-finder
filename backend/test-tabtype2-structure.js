const axios = require('axios');
const cheerio = require('cheerio');

async function testTabType2Structure() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=2`;

  console.log('Testing TabType=2 Structure for Crawling');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Analyzing individual used book items ===');

    // Find common container patterns
    const possibleContainers = [
      '.usedshop_item',
      '.ss_book_box',
      'div[id*="used"]',
      'tr.usedshop',
      '.Ere_prod_list'
    ];

    possibleContainers.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\nFound ${elements.length} items with selector: ${selector}`);
      }
    });

    // Look at the first few items in detail
    console.log('\n=== First 3 items detailed analysis ===');

    // Try to find rows or divs containing book info
    let itemCount = 0;
    $('*').each((index, element) => {
      const text = $(element).text();

      // Look for elements that contain both store name and price and condition
      if (text.includes('원') && (text.includes('최상') || text.includes('상급') || text.includes('중급') || text.includes('중고매장'))) {
        const html = $(element).html();
        if (html && html.length < 1000 && html.length > 100) { // reasonable size
          itemCount++;
          if (itemCount <= 3) {
            console.log(`\n--- Item ${itemCount} ---`);
            console.log('Element:', $(element).prop('tagName'));
            console.log('Class:', $(element).attr('class'));
            console.log('Text preview:', text.substring(0, 200).replace(/\s+/g, ' '));

            // Try to extract info
            const storeName = $(element).find('.Ere_store_name, a[href*="wshopitem"]').text().trim();
            const priceText = $(element).find('.price, .Ere_fs20').text().trim();
            const condition = $(element).find('td:contains("최상"), td:contains("상"), td:contains("중")').text().trim();

            console.log('Extracted store:', storeName);
            console.log('Extracted price:', priceText);
            console.log('Extracted condition:', condition);
          }
        }
      }
    });

    // Look for table structure
    console.log('\n\n=== Checking table structure ===');
    $('table').each((tableIndex, table) => {
      const rows = $(table).find('tr');
      if (rows.length > 5 && rows.length < 100) {
        console.log(`\nTable ${tableIndex}: ${rows.length} rows`);

        // Check first data row
        rows.slice(0, 3).each((rowIndex, row) => {
          const cells = $(row).find('td');
          if (cells.length > 0) {
            console.log(`\n  Row ${rowIndex}: ${cells.length} cells`);
            cells.each((cellIndex, cell) => {
              const cellText = $(cell).text().trim().substring(0, 50);
              console.log(`    Cell ${cellIndex}: ${cellText}`);
            });
          }
        });
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTabType2Structure();
