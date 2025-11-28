const axios = require('axios');
const cheerio = require('cheerio');

async function testStoreLink() {
  const itemId = '68534943'; // 역행자
  const url = `https://www.aladin.co.kr/shop/UsedShop/wuseditemall.aspx?ItemId=${itemId}&TabType=3`;

  console.log('Testing Store Link Extraction');
  console.log('URL:', url);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const storeElements = $('.Ere_store_name');

    console.log(`\n총 ${storeElements.length}개 매장 발견`);

    storeElements.slice(0, 5).each((index, element) => {
      console.log(`\n--- 매장 ${index + 1} ---`);

      const storeText = $(element).text().trim();
      const storeName = storeText.replace('중고매장', '').trim();
      console.log('매장명:', storeName);

      // 링크 추출 시도 1: a 태그 찾기
      const link1 = $(element).find('a').attr('href');
      console.log('find(a) href:', link1);

      // 링크 추출 시도 2: 자기 자신이 a 태그인지
      const link2 = $(element).attr('href');
      console.log('element href:', link2);

      // 링크 추출 시도 3: 부모/형제 찾기
      const link3 = $(element).closest('a').attr('href');
      console.log('closest(a) href:', link3);

      // HTML 구조 확인
      console.log('HTML:', $(element).html());
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStoreLink();
