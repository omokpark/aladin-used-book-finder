const axios = require('axios');
const cheerio = require('cheerio');

async function testTabType2Books() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=2`;

  console.log('Testing TabType=2 - Finding Book List');

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Finding tables with used book data ===');

    // Find all tables and check which one has the book list
    $('table').each((index, table) => {
      const tableText = $(table).text();

      // Look for tables that contain both store names and prices
      if (tableText.includes('중고매장') && tableText.includes('원')) {
        console.log(`\n>>> Found potential book list in Table ${index} <<<`);

        const rows = $(table).find('tr');
        console.log(`Total rows: ${rows.length}`);

        // Analyze first 5 rows in detail
        rows.slice(0, 10).each((rowIndex, row) => {
          const rowText = $(row).text().trim();

          // Skip empty or header rows
          if (rowText.length < 10) return;

          console.log(`\n--- Row ${rowIndex} ---`);
          console.log('Text:', rowText.substring(0, 150).replace(/\s+/g, ' '));

          const cells = $(row).find('td');
          console.log('Number of cells:', cells.length);

          // Try to find store name
          const storeLink = $(row).find('a[href*="wshopitem"]');
          if (storeLink.length > 0) {
            console.log('Store link found:', storeLink.attr('href'));
            console.log('Store text:', storeLink.text().trim());
          }

          // Try to find condition (최상, 상, 중)
          cells.each((cellIndex, cell) => {
            const cellText = $(cell).text().trim();
            if (cellText === '최상' || cellText === '상' || cellText === '중' || cellText === '하') {
              console.log(`Condition in cell ${cellIndex}:`, cellText);
            }
          });

          // Try to find price
          const priceText = rowText.match(/[\d,]+원/g);
          if (priceText) {
            console.log('Prices found:', priceText);
          }
        });
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTabType2Books();
