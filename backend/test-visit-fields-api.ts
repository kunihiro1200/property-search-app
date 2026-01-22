import dotenv from 'dotenv';

dotenv.config();

async function testVisitFieldsAPI() {
  console.log('🔍 Testing Visit Fields API Response...\n');

  const sellerId = 'AA13424';
  const apiUrl = `http://localhost:3000/api/sellers/${sellerId}`;

  try {
    console.log(`📡 Fetching: ${apiUrl}\n`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    console.log('✅ API Response received\n');
    console.log('📊 Basic Info:');
    console.log('  sellerNumber:', data.sellerNumber);
    console.log('  name:', data.name ? '[ENCRYPTED]' : 'NULL');
    console.log('  status:', data.status);
    console.log('  inquiryYear:', data.inquiryYear);
    console.log('  inquiryDate:', data.inquiryDate);
    console.log('  inquirySite:', data.inquirySite);
    console.log('\n🔍 Visit Fields in API Response:');
    console.log('  visitValuationAcquirer:', data.visitValuationAcquirer || 'NULL');
    console.log('  visitAssignee:', data.visitAssignee || 'NULL');
    console.log('  visitAcquisitionDate:', data.visitAcquisitionDate || 'NULL');
    console.log('  visitDate:', data.visitDate || 'NULL');
    console.log('\n');

    // フィールドの存在確認
    const hasVisitFields = 
      'visitValuationAcquirer' in data ||
      'visitAssignee' in data ||
      'visitAcquisitionDate' in data ||
      'visitDate' in data;

    if (hasVisitFields) {
      console.log('✅ Visit fields are included in API response');
      
      // 日付フォーマットのテスト
      if (data.visitAcquisitionDate) {
        const formattedDate = new Date(data.visitAcquisitionDate).toLocaleDateString('ja-JP');
        console.log(`\n📅 Date Format Test:`);
        console.log(`  Raw: ${data.visitAcquisitionDate}`);
        console.log(`  Formatted: ${formattedDate}`);
      }
    } else {
      console.log('❌ Visit fields are NOT included in API response');
      console.log('   This needs to be fixed in the backend API');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testVisitFieldsAPI().catch(console.error);
