const axios = require('axios');

async function testMobileURL() {
  const storeCode = '827148'; // 동탄2하나로마트점

  console.log('Testing Mobile URL structures for Aladin...\n');

  const urlsToTest = [
    // PC URL
    `https://www.aladin.co.kr/shop/usedshop/wshopitem.aspx?SC=${storeCode}&CID=0`,
    // Mobile URL 가능성들
    `https://m.aladin.co.kr/shop/usedshop/wshopitem.aspx?SC=${storeCode}&CID=0`,
    `https://m.aladin.co.kr/m/mshopitem.aspx?SC=${storeCode}&CID=0`,
    `https://m.aladin.co.kr/store/${storeCode}`,
  ];

  for (const url of urlsToTest) {
    console.log(`Testing: ${url}`);
    try {
      const response = await axios.head(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        },
        maxRedirects: 5,
        timeout: 5000
      });

      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  Final URL: ${response.request.res.responseUrl || url}`);
      console.log('');
    } catch (error) {
      if (error.response) {
        console.log(`  ❌ Status: ${error.response.status}`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
      console.log('');
    }
  }

  // 실제 PC URL 확인
  console.log('\n=== Testing PC URL redirect ===');
  try {
    const response = await axios.get(`https://www.aladin.co.kr/shop/usedshop/wshopitem.aspx?SC=${storeCode}&CID=0`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
      },
      maxRedirects: 5
    });
    console.log('Mobile User-Agent로 PC URL 접속 시:');
    console.log('Final URL:', response.request.res.responseUrl);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testMobileURL();
