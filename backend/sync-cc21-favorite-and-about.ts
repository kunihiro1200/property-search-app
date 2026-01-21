import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyService } from './src/services/PropertyService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

/**
 * CC21のお気に入り文言と「こちらの物件について」を同期
 */
async function syncCC21FavoriteAndAbout() {
  console.log('🔄 CC21のお気に入り文言と「こちらの物件について」を同期中...\n');

  try {
    const propertyNumber = 'CC21';
    
    // 1. 物件種別を取得
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: propertyData, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_type')
      .eq('property_number', propertyNumber)
      .single();

    if (propertyError || !propertyData) {
      console.error('❌ 物件情報の取得に失敗しました:', propertyError);
      return;
    }

    const propertyType = propertyData.property_type;
    console.log('✅ 物件種別:', propertyType);

    // 2. 物件種別に応じたセル位置を決定
    const cellMap: Record<string, string> = {
      // 英語
      'land': 'B61',
      'detached_house': 'B142',
      'apartment': 'B139',
      // 日本語
      '土地': 'B61',
      '戸建て': 'B142',
      '戸建': 'B142',
      'マンション': 'B139',
    };

    const cellPosition = cellMap[propertyType];
    if (!cellPosition) {
      console.error('❌ 未対応の物件種別:', propertyType);
      return;
    }

    console.log('✅ お気に入り文言のセル位置:', cellPosition);

    // 3. 業務リストからCC21のスプシURLを取得
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    console.log('✅ 業務リストに接続しました');

    const allRows = await gyomuListClient.readAll();
    const cc21Row = allRows.find(row => row['物件番号'] === propertyNumber);

    if (!cc21Row) {
      console.error('❌ 業務リストにCC21が見つかりません');
      return;
    }

    const spreadsheetUrl = cc21Row['スプシURL'];
    console.log('✅ CC21のスプシURL:', spreadsheetUrl);

    if (!spreadsheetUrl) {
      console.error('❌ CC21のスプシURLが設定されていません');
      return;
    }

    // 4. スプレッドシートURLからIDを抽出
    const spreadsheetIdMatch = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      console.error('❌ スプレッドシートURLが無効です');
      return;
    }

    const spreadsheetId = spreadsheetIdMatch[1];
    console.log('✅ スプレッドシートID:', spreadsheetId);

    // 5. 個別物件スプレッドシート（athomeシート）からお気に入り文言を取得
    const athomeClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await athomeClient.authenticate();
    console.log('✅ 個別物件スプレッドシート（athomeシート）に接続しました');

    const sheets = (athomeClient as any).sheets;

    // 指定セルの値を取得（'athome'と'athome 'の両方を試す）
    let favoriteComment: string | null = null;
    const rangeFormats = [
      `athome!${cellPosition}`,
      `'athome '!${cellPosition}`,
    ];

    for (const range of rangeFormats) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });

        const values = response.data.values;
        if (values && values.length > 0 && values[0].length > 0) {
          favoriteComment = String(values[0][0]).trim();
          console.log('✅ お気に入り文言を取得しました（範囲:', range, '）');
          break;
        }
      } catch (error: any) {
        // 次の形式を試す
        continue;
      }
    }

    if (!favoriteComment) {
      console.warn('⚠️ お気に入り文言が見つかりませんでした');
    } else {
      console.log('📝 お気に入り文言:', favoriteComment);
    }

    // 6. 物件リストスプレッドシート（シート名: 物件）から「こちらの物件について」を取得
    const propertyService = new PropertyService();
    const propertyAbout = await propertyService.getPropertyAbout(propertyNumber);

    if (!propertyAbout) {
      console.warn('⚠️ 「こちらの物件について」が見つかりませんでした');
    } else {
      console.log('✅ 「こちらの物件について」を取得しました');
      console.log('📝 こちらの物件について:', propertyAbout);
    }

    // 7. property_detailsテーブルに保存
    const propertyDetailsService = new PropertyDetailsService();
    const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      favorite_comment: favoriteComment,
      property_about: propertyAbout,
    });

    if (success) {
      console.log('\n✅ CC21のお気に入り文言と「こちらの物件について」を保存しました');
      
      // 保存結果を確認
      const { data: savedData, error: savedError } = await supabase
        .from('property_details')
        .select('property_number, favorite_comment, property_about')
        .eq('property_number', propertyNumber)
        .single();

      if (savedError) {
        console.error('❌ 保存結果の確認に失敗しました:', savedError);
      } else {
        console.log('\n📊 保存結果:');
        console.log('物件番号:', savedData.property_number);
        console.log('favorite_comment:', savedData.favorite_comment ? '保存済み' : 'null');
        console.log('property_about:', savedData.property_about ? '保存済み' : 'null');
      }
    } else {
      console.error('\n❌ CC21のデータ保存に失敗しました');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

syncCC21FavoriteAndAbout();
