/**
 * フロントエンドとバックエンドの接続を確認
 */
import axios from 'axios';

async function checkConnection() {
  console.log('🔍 フロントエンドとバックエンドの接続を確認中...\n');

  // バックエンドの確認
  try {
    console.log('1️⃣ バックエンドの確認...');
    const backendResponse = await axios.get('http://localhost:3000/health', {
      timeout: 5000,
    });
    console.log('✅ バックエンド: 正常に起動しています');
    console.log('   Status:', backendResponse.status);
    console.log('   Data:', backendResponse.data);
  } catch (error: any) {
    console.error('❌ バックエンド: 接続できません');
    if (error.code === 'ECONNREFUSED') {
      console.error('   → バックエンドが起動していません');
      console.error('   → cd backend && npm run dev を実行してください');
    } else {
      console.error('   Error:', error.message);
    }
  }

  console.log('');

  // フロントエンドの確認
  try {
    console.log('2️⃣ フロントエンドの確認...');
    const frontendResponse = await axios.get('http://localhost:5173', {
      timeout: 5000,
    });
    console.log('✅ フロントエンド: 正常に起動しています');
    console.log('   Status:', frontendResponse.status);
  } catch (error: any) {
    console.error('❌ フロントエンド: 接続できません');
    if (error.code === 'ECONNREFUSED') {
      console.error('   → フロントエンドが起動していません');
      console.error('   → cd frontend && npm run dev を実行してください');
    } else {
      console.error('   Error:', error.message);
    }
  }

  console.log('');

  // Supabaseの確認
  try {
    console.log('3️⃣ Supabaseの確認...');
    const supabaseResponse = await axios.get(
      'https://krxhrbtlgfjzsseegaqq.supabase.co/rest/v1/',
      {
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY,
        },
        timeout: 5000,
      }
    );
    console.log('✅ Supabase: 接続成功');
    console.log('   Status:', supabaseResponse.status);
  } catch (error: any) {
    console.error('❌ Supabase: 接続できません');
    console.error('   Error:', error.message);
  }

  console.log('\n📋 次のステップ:');
  console.log('1. ブラウザで http://localhost:5173/login を開く');
  console.log('2. F12キーを押してコンソールを開く');
  console.log('3. エラーメッセージを確認');
}

checkConnection();
