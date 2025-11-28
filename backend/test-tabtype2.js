const axios = require('axios');
const cheerio = require('cheerio');

async function testTabType2() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=2`;

  console.log('Testing TabType=2 (Individual Used Books)');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Looking for condition information ===');

    // Look for any text containing 최상, 상, 중, 하
    $('*').each((index, element) => {
      const text = $(element).text().trim();
      if (text === '최상' || text === '상급' || text === '중급' || text === '하급' || text === '상' || text === '중' || text === '하') {
        console.log('\nFound condition:', text);
        console.log('Element:', $(element).prop('tagName'));
        console.log('Class:', $(element).attr('class'));
        console.log('ID:', $(element).attr('id'));

        // Show parent for context
        const parent = $(element).parent();
        console.log('Parent:', parent.prop('tagName'));
        console.log('Parent class:', parent.attr('class'));

        // Show siblings
        const prevText = $(element).prev().text().trim();
        const nextText = $(element).next().text().trim();
        console.log('Previous sibling text:', prevText);
        console.log('Next sibling text:', nextText);

        // Show full row/context
        const row = $(element).closest('tr, li, div.item, div.usedshop');
        console.log('Row/Container text:', row.text().trim().substring(0, 200));
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTabType2();
