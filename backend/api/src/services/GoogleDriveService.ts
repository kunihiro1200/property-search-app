import { google, drive_v3 } from 'googleapis';
import { BaseRepository } from '../repositories/BaseRepository';
import * as fs from 'fs';
import * as path from 'path';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink?: string;
}

export interface SellerFolder {
  folderId: string;
  folderUrl: string;
  files: DriveFile[];
}

export class GoogleDriveService extends BaseRepository {
  private parentFolderId: string;
  private serviceAccountAuth: any = null;

  constructor() {
    super();
    this.parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '';
    
    if (!this.parentFolderId) {
      console.warn('⚠️ GOOGLE_DRIVE_PARENT_FOLDER_ID is not configured');
    }
    
    this.initializeServiceAccount();
  }

  /**
   * サービスアカウント認証を初期化
   * Vercel環境では環境変数から直接読み込み、ローカル環境ではファイルから読み込む
   */
  private initializeServiceAccount() {
    try {
      console.log('🔧 [GoogleDriveService] Starting initializeServiceAccount...');
      console.log('🔧 [GoogleDriveService] Environment check:', {
        hasGOOGLE_SERVICE_ACCOUNT_JSON: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        hasGOOGLE_SERVICE_ACCOUNT_KEY_PATH: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        NODE_ENV: process.env.NODE_ENV,
      });
      
      let keyFile: any;
      
      // 1. 環境変数から直接読み込み（Vercel用）
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.log('📝 [GoogleDriveService] Loading service account from GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
        console.log(`   Length: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars`);
        console.log(`   First 50 chars: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.substring(0, 50)}`);
        
        let jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        
        // JSONとしてパースを試みる
        let parseError: any = null;
        try {
          keyFile = JSON.parse(jsonString);
          console.log('✅ [GoogleDriveService] Successfully parsed as raw JSON');
        } catch (error: any) {
          parseError = error;
          // パースに失敗した場合、Base64デコードを試みる
          console.log('⚠️ [GoogleDriveService] Failed to parse as JSON, trying Base64 decode...');
          try {
            jsonString = Buffer.from(jsonString, 'base64').toString('utf-8');
            console.log('✅ [GoogleDriveService] Successfully decoded Base64');
            console.log(`   Decoded length: ${jsonString.length} chars`);
            keyFile = JSON.parse(jsonString);
            console.log('✅ [GoogleDriveService] Successfully parsed decoded JSON');
          } catch (decodeError: any) {
            console.error('❌ [GoogleDriveService] Failed to decode Base64 or parse JSON:', decodeError.message);
            console.error('❌ [GoogleDriveService] Original parse error:', parseError.message);
            console.error('❌ [GoogleDriveService] First 100 chars of env var:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON.substring(0, 100));
            throw new Error(`Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON: ${parseError.message}`);
          }
        }
        
        if (keyFile) {
          console.log('✅ [GoogleDriveService] Service account key parsed successfully:');
          console.log(`   - project_id: ${keyFile.project_id || '(not found)'}`);
          console.log(`   - client_email: ${keyFile.client_email || '(not found)'}`);
          console.log(`   - private_key: ${keyFile.private_key ? '(exists, length: ' + keyFile.private_key.length + ')' : '(not found)'}`);
          console.log(`   - type: ${keyFile.type || '(not found)'}`);
        }
      } 
      // 2. ファイルから読み込み（ローカル環境用）
      else {
        const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
        const absolutePath = path.resolve(__dirname, '../../', keyPath);
        
        console.log(`📝 [GoogleDriveService] Attempting to load service account from file: ${absolutePath}`);
        
        if (!fs.existsSync(absolutePath)) {
          console.error('❌ [GoogleDriveService] Service account key file not found:', absolutePath);
          console.error('❌ [GoogleDriveService] GOOGLE_SERVICE_ACCOUNT_JSON environment variable is also not set');
          console.error('❌ [GoogleDriveService] Please set GOOGLE_SERVICE_ACCOUNT_JSON environment variable for Vercel deployment');
          throw new Error('Google Drive service account is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON environment variable.');
        }
        
        console.log('📝 [GoogleDriveService] Loading service account from file:', absolutePath);
        keyFile = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
        console.log('✅ [GoogleDriveService] Successfully loaded service account from file');
      }
      
      console.log('🔧 [GoogleDriveService] Creating GoogleAuth instance...');
      this.serviceAccountAuth = new google.auth.GoogleAuth({
        credentials: keyFile,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      
      console.log('✅ [GoogleDriveService] Google Drive Service Account initialized successfully');
    } catch (error: any) {
      console.error('❌ [GoogleDriveService] Failed to initialize service account:', error.message);
      console.error('❌ [GoogleDriveService] Error stack:', error.stack);
      console.error('❌ [GoogleDriveService] Error name:', error.name);
      console.error('❌ [GoogleDriveService] Error code:', error.code);
      // エラーを再スローして、getDriveClient()で適切なエラーメッセージを返せるようにする
      throw error;
    }
  }

  /**
   * 認証済みDriveクライアントを取得（サービスアカウント使用）
   */
  private async getDriveClient(): Promise<drive_v3.Drive> {
    if (!this.serviceAccountAuth) {
      throw new Error('Google Drive service account is not configured');
    }
    
    const auth = await this.serviceAccountAuth.getClient();
    return google.drive({ version: 'v3', auth });
  }

  /**
   * 親フォルダ内でフォルダ名を検索
   * マイドライブと共有ドライブの両方に対応
   * 売主番号で前方一致検索（フォルダ名が「売主番号_住所_名前」形式のため）
   */
  async findFolderByName(parentId: string, name: string, isSharedDrive: boolean = true): Promise<string | null> {
    try {
      const drive = await this.getDriveClient();
      
      console.log(`🔍 Searching for folder starting with "${name}" in parent: ${parentId} (shared drive: ${isSharedDrive})`);
      
      // クエリパラメータを構築
      const queryParams: any = {
        q: `'${parentId}' in parents and name contains '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
      };
      
      // 共有ドライブの場合
      if (isSharedDrive && this.parentFolderId) {
        queryParams.supportsAllDrives = true;
        queryParams.includeItemsFromAllDrives = true;
        queryParams.corpora = 'drive';
        queryParams.driveId = this.parentFolderId;
      } else {
        // マイドライブの場合
        queryParams.corpora = 'user';
      }

      const response = await drive.files.list(queryParams);

      const files = response.data.files;
      if (files && files.length > 0) {
        // 売主番号で始まるフォルダを探す（前方一致）
        const matchingFolder = files.find(f => f.name?.startsWith(name));
        if (matchingFolder) {
          console.log(`✅ Found folder: ${matchingFolder.name} (${matchingFolder.id})`);
          return matchingFolder.id || null;
        }
      }
      console.log(`📁 Folder starting with "${name}" not found`);
      return null;
    } catch (error: any) {
      console.error('Error finding folder:', error.message);
      throw error;
    }
  }

  /**
   * 親フォルダ内のすべてのサブフォルダを取得
   * @param parentId 親フォルダID
   * @returns サブフォルダの配列（id, name）
   */
  async listSubfolders(parentId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const drive = await this.getDriveClient();
      
      const response = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        orderBy: 'name',
        pageSize: 50,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      });

      const files = response.data.files || [];
      return files.map(f => ({
        id: f.id!,
        name: f.name!,
      }));
    } catch (error: any) {
      console.error('Error listing subfolders:', error.message);
      return [];
    }
  }

  /**
   * 新規フォルダを作成
   * 共有ドライブ対応 - parentsに共有ドライブ内のフォルダIDを指定
   */
  async createFolder(parentId: string, name: string): Promise<string> {
    try {
      const drive = await this.getDriveClient();
      
      console.log(`📁 Creating folder "${name}" in parent: ${parentId} (shared drive: ${this.parentFolderId})`);
      
      // 共有ドライブにフォルダを作成
      // parentsに親フォルダID（共有ドライブのルートID）を指定
      const response = await drive.files.create({
        requestBody: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id, name',
        supportsAllDrives: true,
      });

      if (!response.data.id) {
        throw new Error('Failed to create folder: No ID returned');
      }

      console.log(`✅ Folder created: ${response.data.name} (${response.data.id})`);
      return response.data.id;
    } catch (error: any) {
      console.error('❌ Error creating folder:', error.message);
      if (error.response?.data) {
        console.error('API Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }


  /**
   * フォルダ名を生成: 売主番号_物件住所_依頼者名
   */
  private generateFolderName(sellerNumber: string, propertyAddress?: string, sellerName?: string): string {
    const parts: string[] = [sellerNumber];
    
    if (propertyAddress) {
      // 住所からフォルダ名に使えない文字を除去
      const cleanAddress = propertyAddress.replace(/[\\/:*?"<>|]/g, '').trim();
      if (cleanAddress) parts.push(cleanAddress);
    }
    
    if (sellerName) {
      // 名前からフォルダ名に使えない文字を除去
      const cleanName = sellerName.replace(/[\\/:*?"<>|]/g, '').trim();
      if (cleanName) parts.push(cleanName);
    }
    
    return parts.join('_');
  }

  /**
   * フォルダ名を更新
   * 共有ドライブ対応
   */
  async updateFolderName(folderId: string, newName: string): Promise<void> {
    try {
      const drive = await this.getDriveClient();
      
      console.log(`📝 Updating folder name to "${newName}" for folder: ${folderId}`);
      
      await drive.files.update({
        fileId: folderId,
        requestBody: {
          name: newName,
        },
        supportsAllDrives: true,
      });
      
      console.log(`✅ Folder name updated to: ${newName}`);
    } catch (error: any) {
      console.error('❌ Error updating folder name:', error.message);
      // フォルダ名の更新に失敗しても処理は続行
    }
  }

  /**
   * フォルダの現在の名前を取得
   */
  async getFolderName(folderId: string): Promise<string | null> {
    try {
      const drive = await this.getDriveClient();
      
      const response = await drive.files.get({
        fileId: folderId,
        fields: 'name',
        supportsAllDrives: true,
      });
      
      return response.data.name || null;
    } catch (error: any) {
      console.error('Error getting folder name:', error.message);
      return null;
    }
  }

  /**
   * 売主フォルダを取得または作成
   * 既存フォルダの名前が文字化けしている場合は更新
   */
  async getOrCreateSellerFolder(
    sellerId: string, 
    sellerNumber: string,
    propertyAddress?: string,
    sellerName?: string
  ): Promise<SellerFolder> {
    if (!this.parentFolderId) {
      throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID is not configured');
    }

    // フォルダ名を生成
    const folderName = this.generateFolderName(sellerNumber, propertyAddress, sellerName);

    // まずDBから既存のフォルダIDを確認
    const { data: existingFolder } = await this.table('seller_drive_folders')
      .select('drive_folder_id')
      .eq('seller_number', sellerNumber)
      .single();

    let folderId: string;
    let shouldUpdateName = false;

    if (existingFolder?.drive_folder_id) {
      // DBにフォルダIDがある場合はそれを使用
      folderId = existingFolder.drive_folder_id;
      shouldUpdateName = true; // 既存フォルダの名前を確認・更新
    } else {
      // Google Driveで既存フォルダを検索（売主番号で前方一致検索）
      const existingDriveFolderId = await this.findFolderByName(this.parentFolderId, sellerNumber);
      
      if (existingDriveFolderId) {
        folderId = existingDriveFolderId;
        shouldUpdateName = true; // 既存フォルダの名前を確認・更新
      } else {
        // フォルダが存在しない場合は新規作成（フルネームで作成）
        folderId = await this.createFolder(this.parentFolderId, folderName);
      }

      // DBに保存
      await this.table('seller_drive_folders').upsert({
        seller_id: sellerId,
        seller_number: sellerNumber,
        drive_folder_id: folderId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'seller_number',
      });
    }

    // 既存フォルダの名前が正しいか確認し、必要なら更新
    if (shouldUpdateName && sellerName) {
      const currentName = await this.getFolderName(folderId);
      if (currentName && currentName !== folderName) {
        // 現在の名前が期待する名前と異なる場合（文字化けしている可能性）
        console.log(`📝 Folder name mismatch: "${currentName}" vs expected "${folderName}"`);
        await this.updateFolderName(folderId, folderName);
      }
    }

    // ファイル一覧を取得
    const files = await this.listFiles(folderId);

    return {
      folderId,
      folderUrl: this.getFolderUrl(folderId),
      files,
    };
  }

  /**
   * フォルダ内のファイル一覧を取得
   * 共有ドライブ対応 - corpora: 'drive'とdriveIdを指定
   */
  async listFiles(folderId: string): Promise<DriveFile[]> {
    try {
      const drive = await this.getDriveClient();
      
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink)',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: this.parentFolderId,
      });

      const files = response.data.files || [];
      
      return files.map(file => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: parseInt(file.size || '0', 10),
        modifiedTime: file.modifiedTime || '',
        webViewLink: file.webViewLink || this.getPreviewUrl(file.id || ''),
        webContentLink: file.webContentLink || this.getDownloadUrl(file.id || ''),
      }));
    } catch (error: any) {
      console.error('Error listing files:', error.message);
      throw error;
    }
  }

  /**
   * ファイルをアップロード
   * 共有ドライブ対応
   */
  async uploadFile(
    folderId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DriveFile> {
    try {
      const drive = await this.getDriveClient();
      
      console.log(`📤 Uploading file "${fileName}" to folder: ${folderId}`);
      
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: mimeType,
          body: stream,
        },
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      const file = response.data;
      
      console.log(`✅ File uploaded: ${file.name} (${file.id})`);
      
      return {
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: parseInt(file.size || '0', 10),
        modifiedTime: file.modifiedTime || new Date().toISOString(),
        webViewLink: file.webViewLink || this.getPreviewUrl(file.id || ''),
        webContentLink: file.webContentLink || this.getDownloadUrl(file.id || ''),
      };
    } catch (error: any) {
      console.error('❌ Error uploading file:', error.message);
      if (error.response?.data) {
        console.error('API Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * ファイルを削除
   * 共有ドライブでは完全削除（files.delete）を使用
   * trashed: true はコンテンツ管理者以上の権限が必要なため
   */
  async deleteFile(fileId: string): Promise<void> {
    const drive = await this.getDriveClient();
    
    try {
      console.log(`🗑️ Deleting file: ${fileId}`);
      
      // 完全削除を試行
      // 共有ドライブでは supportsAllDrives: true が必須
      await drive.files.delete({
        fileId,
        supportsAllDrives: true,
      });
      
      console.log(`✅ File deleted: ${fileId}`);
    } catch (error: any) {
      console.error('❌ Error deleting file:', error.message);
      if (error.response?.data) {
        console.error('API Error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      // 完全削除が失敗した場合、ゴミ箱移動を試行
      if (error.code === 403 || error.code === 404) {
        console.log('🔄 Trying to move to trash instead...');
        try {
          await drive.files.update({
            fileId,
            requestBody: {
              trashed: true,
            },
            supportsAllDrives: true,
          });
          console.log(`✅ File moved to trash: ${fileId}`);
          return;
        } catch (trashError: any) {
          console.error('❌ Error moving file to trash:', trashError.message);
        }
      }
      
      // 権限エラーの場合、より分かりやすいエラーメッセージを生成
      if (error.code === 403 || error.message?.includes('insufficient permissions') || 
          error.message?.includes('does not have sufficient permissions')) {
        const permissionError = new Error(
          'このファイルを削除する権限がありません。フォルダの所有者にサービスアカウントへの編集権限の付与を依頼してください。'
        );
        (permissionError as any).code = 403;
        (permissionError as any).originalError = error;
        throw permissionError;
      }
      
      throw error;
    }
  }

  /**
   * プレビューURLを生成
   */
  getPreviewUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  /**
   * ダウンロードURLを生成
   */
  getDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * フォルダURLを生成
   */
  getFolderUrl(folderId: string): string {
    return `https://drive.google.com/drive/folders/${folderId}`;
  }

  /**
   * 画像ファイルのみを取得
   * @param folderId フォルダID
   * @returns 画像ファイル一覧
   */
  async listImageFiles(folderId: string): Promise<DriveFile[]> {
    const allFiles = await this.listFiles(folderId);
    
    // 画像ファイル形式のみをフィルタリング
    const imageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    return allFiles.filter(file => 
      imageMimeTypes.includes(file.mimeType.toLowerCase())
    );
  }

  /**
   * サムネイル付き画像一覧を取得
   * @param folderId フォルダID
   * @returns サムネイル付き画像ファイル一覧
   */
  async listImagesWithThumbnails(folderId: string): Promise<DriveFile[]> {
    try {
      console.log(`🔍 [listImagesWithThumbnails] Starting for folder: ${folderId}`);
      const drive = await this.getDriveClient();
      console.log(`✅ [listImagesWithThumbnails] Drive client obtained`);
      
      // 共有ドライブを使用している場合は corpora: 'drive' と driveId を指定
      // 使用していない場合は corpora: 'user' を指定
      const isSharedDrive = !!this.parentFolderId;
      
      const queryParams: any = {
        q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/')`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, thumbnailLink)',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };
      
      if (isSharedDrive) {
        queryParams.corpora = 'drive';
        queryParams.driveId = this.parentFolderId;
      } else {
        queryParams.corpora = 'user';
      }

      console.log(`📋 [listImagesWithThumbnails] Query params:`, JSON.stringify(queryParams, null, 2));
      console.log(`🚀 [listImagesWithThumbnails] Calling Google Drive API...`);
      
      const response = await drive.files.list(queryParams);
      
      console.log(`✅ [listImagesWithThumbnails] API call completed`);

      const files = response.data.files || [];
      console.log(`📊 [listImagesWithThumbnails] Found ${files.length} images`);
      
      return files.map(file => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: parseInt(file.size || '0', 10),
        modifiedTime: file.modifiedTime || '',
        webViewLink: file.webViewLink || this.getPreviewUrl(file.id || ''),
        webContentLink: file.webContentLink || this.getDownloadUrl(file.id || ''),
        thumbnailLink: (file as any).thumbnailLink || undefined,
      }));
    } catch (error: any) {
      console.error('❌ [listImagesWithThumbnails] Error:', error.message);
      console.error('❌ [listImagesWithThumbnails] Error stack:', error.stack);
      console.error('❌ [listImagesWithThumbnails] Error details:', {
        folderId,
        isSharedDrive: !!this.parentFolderId,
        parentFolderId: this.parentFolderId,
        errorCode: error.code,
        errorMessage: error.message,
        errorName: error.name,
      });
      
      // エラー時は空の配列を返す（ユーザー体験を損なわない）
      console.warn(`⚠️ [listImagesWithThumbnails] Returning empty array due to error`);
      return [];
    }
  }

  /**
   * 画像データを取得
   * @param fileId ファイルID
   * @returns 画像データ（Buffer、mimeType、サイズ）
   */
  async getImageData(fileId: string): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
    try {
      const drive = await this.getDriveClient();
      
      // ファイルメタデータを取得
      const metadata = await drive.files.get({
        fileId,
        fields: 'mimeType, size',
        supportsAllDrives: true,
      });

      // ファイルデータを取得
      const response = await drive.files.get({
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      }, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data as ArrayBuffer);
      const mimeType = metadata.data.mimeType || 'image/jpeg';
      const size = parseInt(metadata.data.size || '0', 10);

      return {
        buffer,
        mimeType,
        size
      };
    } catch (error: any) {
      console.error('Error getting image data:', error.message);
      throw error;
    }
  }

  /**
   * ファイルを取得（プレビュー用）
   * @param fileId ファイルID
   * @returns ファイルデータとメタデータ
   */
  async getFile(fileId: string): Promise<{ data: Buffer; mimeType: string } | null> {
    try {
      const imageData = await this.getImageData(fileId);
      return {
        data: imageData.buffer,
        mimeType: imageData.mimeType
      };
    } catch (error: any) {
      console.error('Error getting file:', error.message);
      return null;
    }
  }

  /**
   * フォルダの内容を取得（フォルダとファイルの一覧）
   * @param folderId フォルダID（nullの場合はルートフォルダ）
   */
  async listFolderContents(folderId: string | null): Promise<{ files: any[]; path: any[] }> {
    try {
      const drive = await this.getDriveClient();
      
      // フォルダIDが指定されていない場合は親フォルダを使用
      const targetFolderId = folderId || this.parentFolderId;
      
      console.log(`📂 Listing contents of folder:`, {
        folderId,
        targetFolderId,
        parentFolderId: this.parentFolderId,
        isSharedDrive: true,
      });
      
      // フォルダとファイルを取得（共有ドライブ対応）
      const response = await drive.files.list({
        q: `'${targetFolderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink)',
        orderBy: 'folder,name',
        pageSize: 100,
        // 共有ドライブサポートのための必須パラメータ
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: this.parentFolderId, // 共有ドライブID
      });

      const files = response.data.files || [];
      
      console.log(`✅ Found ${files.length} items in folder`);
      console.log('📋 Files:', files.map(f => ({ 
        id: f.id, 
        name: f.name, 
        type: f.mimeType,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder'
      })));
      
      // ファイルを整形
      const formattedFiles = files.map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime!,
        webViewLink: file.webViewLink || '',
        thumbnailLink: file.thumbnailLink || undefined,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      }));

      // フォルダパスを取得
      const path = folderId ? await this.getFolderPath(folderId) : [];

      return {
        files: formattedFiles,
        path,
      };
    } catch (error: any) {
      console.error('❌ Error listing folder contents:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
        response: error.response?.data,
        folderId,
        targetFolderId: folderId || this.parentFolderId,
      });
      throw new Error(`フォルダ内容の取得に失敗しました: ${error.message}`);
    }
  }

  /**
   * フォルダのパスを取得（ルートからのパンくずリスト）
   * @param folderId フォルダID
   */
  async getFolderPath(folderId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const drive = await this.getDriveClient();
      const path: Array<{ id: string; name: string }> = [];
      
      let currentId = folderId;
      
      // ルートフォルダに到達するまで親をたどる
      while (currentId && currentId !== this.parentFolderId) {
        const response = await drive.files.get({
          fileId: currentId,
          fields: 'id, name, parents',
          supportsAllDrives: true,
        });

        const file = response.data;
        path.unshift({
          id: file.id!,
          name: file.name!,
        });

        // 親フォルダに移動
        if (file.parents && file.parents.length > 0) {
          currentId = file.parents[0];
        } else {
          break;
        }
      }

      return path;
    } catch (error: any) {
      console.error('Error getting folder path:', error.message);
      return [];
    }
  }

  /**
   * ファイルのメタデータを取得
   * @param fileId ファイルID
   */
  async getFileMetadata(fileId: string): Promise<DriveFile | null> {
    try {
      const drive = await this.getDriveClient();
      
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, thumbnailLink',
        supportsAllDrives: true,
      });

      const file = response.data;
      
      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime!,
        webViewLink: file.webViewLink || '',
        webContentLink: file.webContentLink || '',
        thumbnailLink: file.thumbnailLink || undefined,
      };
    } catch (error: any) {
      console.error('Error getting file metadata:', error.message);
      return null;
    }
  }

  /**
   * ルートレベルで物件番号のフォルダを検索
   * まずマイドライブを検索し、見つからなければ共有ドライブも検索する
   * 
   * フォルダ名のパターン:
   * - AA13069_xxx (物件番号で始まる)
   * - U_AA13069_xxx (プレフィックス付き)
   * - その他の形式で物件番号を含む
   * 
   * @param folderName 検索するフォルダ名（物件番号）
   * @returns フォルダID、見つからない場合はnull
   */
  async searchFolderByName(folderName: string): Promise<string | null> {
    try {
      const drive = await this.getDriveClient();
      
      // 1. まずマイドライブを検索
      console.log(`🔍 Searching for folder containing "${folderName}" in My Drive`);
      
      const myDriveResponse = await drive.files.list({
        q: `name contains '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, parents)',
        corpora: 'user',
        pageSize: 20,
      });

      let files = myDriveResponse.data.files || [];
      
      if (files.length > 0) {
        console.log(`📋 Found ${files.length} folders in My Drive containing "${folderName}":`);
        files.forEach(f => console.log(`  - ${f.name} (${f.id})`));
      } else {
        // 2. マイドライブで見つからなければ共有ドライブも検索
        console.log(`📁 Not found in My Drive, searching in Shared Drives...`);
        
        const sharedDriveResponse = await drive.files.list({
          q: `name contains '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name, parents)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
          pageSize: 20,
        });
        
        files = sharedDriveResponse.data.files || [];
        
        if (files.length > 0) {
          console.log(`📋 Found ${files.length} folders in Shared Drives containing "${folderName}":`);
          files.forEach(f => console.log(`  - ${f.name} (${f.id})`));
        }
      }
      
      if (files.length > 0) {
        // 優先順位:
        // 1. 物件番号で始まるフォルダ（例: AA13069_xxx）
        // 2. プレフィックス付きで物件番号を含むフォルダ（例: U_AA13069_xxx）
        // 3. その他、物件番号を含むフォルダ
        
        // 1. 物件番号で始まるフォルダを優先
        let matchingFolder = files.find(f => f.name?.startsWith(folderName));
        
        // 2. プレフィックス付きフォルダを検索（例: U_AA13069, S_AA13069など）
        if (!matchingFolder) {
          matchingFolder = files.find(f => {
            const name = f.name || '';
            // プレフィックス_物件番号 のパターンにマッチ
            const prefixPattern = new RegExp(`^[A-Z]_${folderName}`);
            return prefixPattern.test(name);
          });
        }
        
        // 3. その他、物件番号を含むフォルダ（最後の手段）
        if (!matchingFolder) {
          matchingFolder = files.find(f => f.name?.includes(folderName));
        }
        
        if (matchingFolder) {
          console.log(`✅ Selected folder: ${matchingFolder.name} (${matchingFolder.id})`);
          return matchingFolder.id || null;
        }
      }
      
      console.log(`❌ Folder containing "${folderName}" not found in My Drive or Shared Drives`);
      return null;
    } catch (error: any) {
      console.error('Error searching folder:', error.message);
      throw error;
    }
  }

  /**
   * サブフォルダ内を再帰的に検索して「athome公開」フォルダを探す
   * @param parentId 親フォルダID
   * @param isSharedDrive 共有ドライブかどうか
   * @param depth 現在の深さ（最大3階層まで）
   * @returns 「athome公開」フォルダのID、見つからない場合はnull
   */
  private async searchAthomeFolderRecursively(
    parentId: string,
    isSharedDrive: boolean,
    depth: number = 0
  ): Promise<string | null> {
    // 最大3階層まで検索
    if (depth >= 3) {
      return null;
    }

    try {
      const drive = await this.getDriveClient();
      
      // サブフォルダ一覧を取得
      const queryParams: any = {
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };
      
      if (isSharedDrive && this.parentFolderId) {
        queryParams.corpora = 'drive';
        queryParams.driveId = this.parentFolderId;
      } else {
        queryParams.corpora = 'user';
      }

      const response = await drive.files.list(queryParams);
      const subfolders = response.data.files || [];
      
      console.log(`  📂 Found ${subfolders.length} subfolders at depth ${depth}`);
      
      // 各サブフォルダで「athome公開」を探す
      for (const subfolder of subfolders) {
        console.log(`    - Checking: ${subfolder.name}`);
        
        // 「athome公開」フォルダを発見
        if (subfolder.name?.includes('athome') && subfolder.name?.includes('公開')) {
          console.log(`    ✅ Found "athome公開" in subfolder: ${subfolder.name}`);
          return subfolder.id || null;
        }
        
        // さらに深く検索
        const foundId = await this.searchAthomeFolderRecursively(subfolder.id!, isSharedDrive, depth + 1);
        if (foundId) {
          return foundId;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(`Error searching subfolders at depth ${depth}:`, error.message);
      return null;
    }
  }

  /**
   * 「athome公開」フォルダから画像を取得
   * 
   * 取得ロジック:
   * 1. storage_locationがあれば、そのフォルダ内の「athome公開」フォルダから画像取得（共有ドライブ）
   * 2. storage_locationがなければ、業務リストのマイドライブで物件番号を含むフォルダを検索
   *    - 直接ある場合: 物件番号フォルダ/athome公開
   *    - サブフォルダ内にある場合: 親フォルダ/物件番号フォルダ/athome公開
   * 
   * @param storageLocation storage_locationのURL（オプション）
   * @param propertyNumber 物件番号
   * @returns 画像情報配列（id, name, thumbnailUrl, fullImageUrl）
   */
  async getImagesFromAthomePublicFolder(
    storageLocation: string | null,
    propertyNumber: string
  ): Promise<Array<{id: string; name: string; thumbnailUrl: string; fullImageUrl: string}>> {
    try {
      let parentFolderId: string | null = null;
      let isSharedDrive = false;

      // 1. storage_locationがあれば、そこから取得（共有ドライブ）
      if (storageLocation) {
        console.log(`📂 Using storage_location (shared drive): ${storageLocation}`);
        parentFolderId = this.extractFolderIdFromUrl(storageLocation);
        isSharedDrive = true;
      }

      // 2. storage_locationがなければ、物件番号で検索（マイドライブ）
      if (!parentFolderId) {
        console.log(`🔍 Searching for folder containing property number in My Drive: ${propertyNumber}`);
        parentFolderId = await this.searchFolderByName(propertyNumber);
        isSharedDrive = false;
      }

      if (!parentFolderId) {
        console.log(`❌ Parent folder not found for property: ${propertyNumber}`);
        return [];
      }

      // 3. 「athome公開」フォルダを検索（直接の子フォルダ）
      console.log(`🔍 Searching for "athome公開" folder in: ${parentFolderId} (${isSharedDrive ? 'shared drive' : 'my drive'})`);
      let athomeFolderId = await this.findFolderByName(parentFolderId, 'athome公開', isSharedDrive);

      // 4. 直接見つからない場合は、サブフォルダ内を再帰的に検索
      if (!athomeFolderId) {
        console.log(`📁 "athome公開" not found directly, searching in subfolders...`);
        athomeFolderId = await this.searchAthomeFolderRecursively(parentFolderId, isSharedDrive);
      }

      if (!athomeFolderId) {
        console.log(`❌ "athome公開" folder not found in: ${parentFolderId} or its subfolders`);
        return [];
      }

      // 4. 「athome公開」フォルダ内の画像を取得
      console.log(`📸 Getting images from "athome公開" folder: ${athomeFolderId}`);
      const images = await this.listImagesWithThumbnails(athomeFolderId);

      // 5. 画像URLを生成（webContentLinkを優先、なければ従来のURL）
      const imageUrls = images.map(img => {
        // webContentLinkがあればそれを使用（ダウンロードリンク）
        const fullImageUrl = img.webContentLink || `https://drive.google.com/uc?export=download&id=${img.id}`;
        // サムネイルURLは従来通り
        const thumbnailUrl = img.thumbnailLink || `https://drive.google.com/thumbnail?id=${img.id}&sz=w400`;
        
        return {
          id: img.id,
          name: img.name,
          thumbnailUrl,
          fullImageUrl,
        };
      });

      console.log(`✅ Found ${imageUrls.length} images in "athome公開" folder`);
      return imageUrls;
    } catch (error: any) {
      console.error('Error getting images from athome public folder:', error.message);
      return [];
    }
  }

  /**
   * Google DriveのURLからフォルダIDを抽出
   * @param url Google DriveのURL
   * @returns フォルダID、抽出できない場合はnull
   */
  private extractFolderIdFromUrl(url: string): string | null {
    try {
      // https://drive.google.com/drive/folders/FOLDER_ID 形式
      const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}
