const axios = require('axios');
const cheerio = require('cheerio');

async function testTabType3Detail() {
  const itemId = '68534943';
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing TabType=3 - Detailed Analysis');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== Full page text search for condition ===');
    const bodyText = $.text();

    // Check if condition info exists
    const hasCondition = /최상|상급|중급|하급/.test(bodyText);
    console.log('Has condition keywords:', hasCondition);

    // Look for entire blocks containing store info
    console.log('\n=== Analyzing Ere_sub_div2_preview elements ===');
    $('.Ere_sub_div2_preview').each((index, element) => {
      if (index >= 2) return; // Just first 2

      console.log(`\n--- Block ${index} ---`);
      const html = $(element).html();
      const text = $(element).text();

      console.log('Text content:', text.substring(0, 300));
      console.log('\nHTML (first 500 chars):', html.substring(0, 500));
    });

    // Check for any links or AJAX calls that might load condition data
    console.log('\n=== Looking for data-* attributes or onclick handlers ===');
    $('[data-condition], [data-grade], [data-status]').each((i, el) => {
      console.log('Found element with data attribute:');
      console.log('Attributes:', $(el).attr());
    });

    // Check onclick handlers
    $('[onclick*="condition"], [onclick*="grade"], [onclick*="status"]').each((i, el) => {
      console.log('Found element with onclick:');
      console.log('onclick:', $(el).attr('onclick'));
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTabType3Detail();
