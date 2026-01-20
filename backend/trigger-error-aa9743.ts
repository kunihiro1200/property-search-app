import fetch from 'node-fetch';

async function triggerError() {
  console.log('=== エラーを発生させて Vercel ログに記録 ===\n');

  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  const propertyNumber = 'AA9743';
  
  console.log(`リクエスト: ${baseUrl}/api/public/properties/${propertyNumber}/images\n`);
  
  try {
    const response = await fetch(`${baseUrl}/api/public/properties/${propertyNumber}/images`);
    console.log(`ステータス: ${response.status}`);
    
    const text = await response.text();
    console.log(`レスポンス: ${text}`);
    
    console.log(`\nVercel ID: ${response.headers.get('x-vercel-id')}`);
    console.log(`\nこのIDでログを確認してください：`);
    console.log(`vercel logs --url=${baseUrl}`);
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

triggerError();
