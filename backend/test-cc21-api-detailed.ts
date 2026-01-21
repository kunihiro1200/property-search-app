async function testCC21API() {
  console.log('🔍 CC21の本番環境APIレスポンスを詳細確認...\n');

  try {
    const response = await fetch('https://baikyaku-property-site3.vercel.app/api/public/properties/CC21');
    
    if (!response.ok) {
      console.error('❌ APIエラー:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ APIレスポンス成功\n');
    console.log('📋 完全なレスポンス:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🔍 おすすめコメント詳細:');
    console.log('   - recommendedComments:', data.recommendedComments);
    console.log('   - 型:', typeof data.recommendedComments);
    console.log('   - 配列か:', Array.isArray(data.recommendedComments));
    console.log('   - 長さ:', data.recommendedComments?.length);
    
    if (data.recommendedComments && Array.isArray(data.recommendedComments)) {
      console.log('\n   内容:');
      data.recommendedComments.forEach((comment: any, index: number) => {
        console.log(`   [${index + 1}]`, comment);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testCC21API();
