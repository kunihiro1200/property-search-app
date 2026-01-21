import dotenv from 'dotenv';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function syncCC21FavoriteComment() {
  console.log('🔄 CC21のお気に入り文言を同期中...\n');

  try {
    // サービスアカウント認証
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    
    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    
    console.log('✅ 認証成功\n');

    // B142セル（お気に入り文言）を取得
    console.log('📋 B142セル（お気に入り文言）を読み取り中...');
    const b142Response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!B142',
    });
    
    const favoriteComment = b142Response.data.values?.[0]?.[0];
    console.log('お気に入り文言:', favoriteComment);

    if (!favoriteComment) {
      console.log('❌ お気に入り文言が見つかりませんでした');
      return;
    }

    // Supabaseに接続
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // CC21のproperty_detailsを更新
    console.log('\n📝 データベースを更新中...');
    const { data, error } = await supabase
      .from('property_details')
      .update({
        favorite_comment: favoriteComment,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', 'CC21')
      .select();

    if (error) {
      console.error('❌ データベース更新エラー:', error);
      throw error;
    }

    console.log('✅ データベース更新成功:', data);
    console.log('\n🎉 CC21のお気に入り文言の同期が完了しました！');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

syncCC21FavoriteComment().catch(console.error);
