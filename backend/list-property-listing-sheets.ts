/**
 * スプレッドシート内の全シート名を取得するスクリプト
 * 
 * 目的: 物件リストのシート名を特定するため、スプレッドシート内の全シート名を一覧表示する
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function listAllSheets() {
  try {
    console.log('='.repeat(60));
    console.log('スプレッドシート シート名一覧取得');
    console.log('='.repeat(60));
    console.log('');

    // スプレッドシートIDを環境変数から取得
    const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('環境変数 PROPERTY_LISTING_SPREADSHEET_ID が設定されていません');
    }

    console.log(`スプレッドシートID: ${spreadsheetId}`);
    console.log('');

    // Google Sheets APIの認証設定
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(__dirname, '../google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // スプレッドシートのメタデータを取得
    console.log('スプレッドシートのメタデータを取得中...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    if (!response.data.sheets || response.data.sheets.length === 0) {
      console.log('シートが見つかりませんでした');
      return;
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log(`シート数: ${response.data.sheets.length}`);
    console.log('-'.repeat(60));
    console.log('');

    // 各シートの情報を表示
    response.data.sheets.forEach((sheet, index) => {
      const sheetProperties = sheet.properties;
      if (sheetProperties) {
        console.log(`[${index}] ${sheetProperties.title}`);
        console.log(`    シートID: ${sheetProperties.sheetId}`);
        console.log(`    インデックス: ${sheetProperties.index}`);
        console.log(`    行数: ${sheetProperties.gridProperties?.rowCount || 'N/A'}`);
        console.log(`    列数: ${sheetProperties.gridProperties?.columnCount || 'N/A'}`);
        console.log('');
      }
    });

    console.log('='.repeat(60));
    console.log('取得完了');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ エラーが発生しました:');
    console.error('');
    
    if (error instanceof Error) {
      console.error(`エラーメッセージ: ${error.message}`);
      console.error('');
      console.error('スタックトレース:');
      console.error(error.stack);
    } else {
      console.error(error);
    }
    
    console.error('');
    console.error('確認事項:');
    console.error('1. 環境変数 PROPERTY_LISTING_SPREADSHEET_ID が正しく設定されているか');
    console.error('2. google-service-account.json ファイルが存在するか');
    console.error('3. サービスアカウントにスプレッドシートへのアクセス権限があるか');
    
    process.exit(1);
  }
}

// スクリプトを実行
listAllSheets();
