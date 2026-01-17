/**
 * Google Driveフォルダ内の全ファイルにサービスアカウントの編集権限を付与するスクリプト
 * 
 * 使用方法:
 * npx ts-node grant-drive-permissions.ts <フォルダURL>
 * 
 * 例:
 * npx ts-node grant-drive-permissions.ts "https://drive.google.com/drive/folders/1ABC123..."
 */

import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

// サービスアカウントの認証情報ファイルパス
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'google-service-account.json');

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
}

async function getDriveClient() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`サービスアカウントファイルが見つかりません: ${SERVICE_ACCOUNT_PATH}`);
  }

  const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

function extractFolderIdFromUrl(url: string): string | null {
  const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(folderIdRegex);
  return match ? match[1] : null;
}

async function listAllFilesInFolder(drive: any, folderId: string): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (response.data.files) {
      files.push(...response.data.files);
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
}

async function checkFilePermissions(drive: any, fileId: string): Promise<any[]> {
  try {
    const response = await drive.permissions.list({
      fileId,
      fields: 'permissions(id, type, role, emailAddress)',
      supportsAllDrives: true,
    });
    return response.data.permissions || [];
  } catch (error: any) {
    console.error(`  ⚠️ 権限確認エラー: ${error.message}`);
    return [];
  }
}

async function grantEditorPermission(
  drive: any, 
  fileId: string, 
  serviceAccountEmail: string
): Promise<boolean> {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: serviceAccountEmail,
      },
      supportsAllDrives: true,
      sendNotificationEmail: false,
    });
    return true;
  } catch (error: any) {
    if (error.message?.includes('already has access')) {
      console.log(`  ℹ️ 既に権限があります`);
      return true;
    }
    console.error(`  ❌ 権限付与エラー: ${error.message}`);
    return false;
  }
}

async function main() {
  const folderUrl = process.argv[2];

  if (!folderUrl) {
    console.log('使用方法: npx ts-node grant-drive-permissions.ts <フォルダURL>');
    console.log('');
    console.log('例:');
    console.log('  npx ts-node grant-drive-permissions.ts "https://drive.google.com/drive/folders/1ABC123..."');
    process.exit(1);
  }

  const folderId = extractFolderIdFromUrl(folderUrl);
  if (!folderId) {
    console.error('❌ 無効なフォルダURLです');
    process.exit(1);
  }

  console.log('🔧 Google Drive権限付与スクリプト');
  console.log('================================');
  console.log(`📁 フォルダID: ${folderId}`);
  console.log('');

  try {
    const drive = await getDriveClient();
    
    // サービスアカウントのメールアドレスを取得
    const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    const serviceAccountEmail = credentials.client_email;
    console.log(`🔑 サービスアカウント: ${serviceAccountEmail}`);
    console.log('');

    // フォルダ内のファイル一覧を取得
    console.log('📋 ファイル一覧を取得中...');
    const files = await listAllFilesInFolder(drive, folderId);
    console.log(`   ${files.length}件のファイルが見つかりました`);
    console.log('');

    if (files.length === 0) {
      console.log('ℹ️ フォルダ内にファイルがありません');
      return;
    }

    // 各ファイルの権限を確認・付与
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      console.log(`📄 ${file.name} (${file.id})`);
      
      // 現在の権限を確認
      const permissions = await checkFilePermissions(drive, file.id);
      const hasPermission = permissions.some(
        (p: any) => p.emailAddress === serviceAccountEmail && (p.role === 'writer' || p.role === 'owner')
      );

      if (hasPermission) {
        console.log(`  ✅ 既に編集権限があります`);
        skipCount++;
      } else {
        console.log(`  🔄 編集権限を付与中...`);
        const success = await grantEditorPermission(drive, file.id, serviceAccountEmail);
        if (success) {
          console.log(`  ✅ 権限を付与しました`);
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log('');
    console.log('================================');
    console.log('📊 結果サマリー');
    console.log(`   ✅ 権限付与成功: ${successCount}件`);
    console.log(`   ⏭️ スキップ（既存）: ${skipCount}件`);
    console.log(`   ❌ エラー: ${errorCount}件`);
    console.log('');

    if (errorCount > 0) {
      console.log('⚠️ 一部のファイルで権限付与に失敗しました。');
      console.log('   フォルダの所有者に以下を依頼してください：');
      console.log('   1. フォルダの共有設定を開く');
      console.log('   2. 「編集者は権限を変更できる」オプションを有効にする');
      console.log('   または');
      console.log('   3. 各ファイルを選択して、サービスアカウントに編集権限を付与する');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
