import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { sheetsRateLimiter } from './RateLimiter';

export interface SheetRow {
  [columnName: string]: string | number | null;
}

export interface BatchUpdate {
  rowIndex: number;
  values: SheetRow;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  // OAuth 2.0 credentials
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  // Service Account credentials (fallback)
  serviceAccountEmail?: string;
  privateKey?: string;
  // Service Account JSON file path
  serviceAccountKeyPath?: string;
}

/**
 * Google Sheets APIクライアント
 * 
 * スプレッドシートの読み書きを抽象化し、認証やエラーハンドリングを管理します。
 * OAuth 2.0とサービスアカウント認証の両方に対応。
 */
export class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets | null = null;
  private auth: JWT | any = null;
  private config: GoogleSheetsConfig;
  private headerCache: string[] | null = null;

  constructor(config: GoogleSheetsConfig) {
    // spreadsheetIdのバリデーション
    if (!config.spreadsheetId) {
      throw new Error('Missing required parameters: spreadsheetId');
    }
    this.config = config;
  }

  /**
   * 認証を実行（Environment Contract準拠）
   * 優先順位: 
   * 1. GOOGLE_SERVICE_ACCOUNT_JSON (JSON文字列)
   * 2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY (個別環境変数)
   * 3. serviceAccountKeyPath (JSONファイルパス)
   * 4. serviceAccountEmail + privateKey (コンストラクタ引数)
   * 5. OAuth 2.0
   */
  async authenticate(): Promise<void> {
    console.error('[GoogleSheetsClient] Starting authentication...');
    console.error('[GoogleSheetsClient] Environment check:', {
      hasGOOGLE_SERVICE_ACCOUNT_JSON: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      GOOGLE_SERVICE_ACCOUNT_JSON_length: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0,
      hasGOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasGOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      hasServiceAccountKeyPath: !!this.config.serviceAccountKeyPath,
      hasServiceAccountEmail: !!this.config.serviceAccountEmail,
      hasPrivateKey: !!this.config.privateKey,
      hasOAuth: !!(this.config.clientId && this.config.clientSecret && this.config.refreshToken),
    });
    
    try {
      // 1. 環境変数からJSON読み込み（Vercel環境用）
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.error('[GoogleSheetsClient] Using GOOGLE_SERVICE_ACCOUNT_JSON');
        await this.authenticateWithServiceAccountJson();
      }
      // 2. 個別の環境変数から読み込み（Vercel環境用 - フォールバック）
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        console.error('[GoogleSheetsClient] Using GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY');
        await this.authenticateWithServiceAccountEnv();
      }
      // 3. JSONファイルから読み込み（ローカル環境用）
      else if (this.config.serviceAccountKeyPath) {
        console.error('[GoogleSheetsClient] Using serviceAccountKeyPath');
        await this.authenticateWithServiceAccountFile();
      }
      // 4. コンストラクタ引数から読み込み
      else if (this.config.serviceAccountEmail && this.config.privateKey) {
        console.error('[GoogleSheetsClient] Using serviceAccountEmail + privateKey');
        await this.authenticateWithServiceAccount();
      } 
      // 5. OAuth 2.0認証（フォールバック）
      else if (this.config.clientId && this.config.clientSecret && this.config.refreshToken) {
        console.error('[GoogleSheetsClient] Using OAuth 2.0');
        await this.authenticateWithOAuth();
      } 
      else {
        console.error('[GoogleSheetsClient] No valid authentication credentials provided');
        throw new Error('No valid authentication credentials provided');
      }
    } catch (error: any) {
      console.error('[GoogleSheetsClient] Authentication error:', error.message);
      console.error('[GoogleSheetsClient] Error stack:', error.stack);
      throw new Error(`Google Sheets authentication failed: ${error.message}`);
    }
  }

  /**
   * OAuth 2.0認証を実行
   */
  private async authenticateWithOAuth(): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      'http://localhost:3000/api/google/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: this.config.refreshToken,
    });

    this.auth = oauth2Client;
    this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  }

  /**
   * サービスアカウント認証を実行（環境変数のJSONから）
   * Environment Contract準拠: Vercel環境用
   */
  private async authenticateWithServiceAccountJson(): Promise<void> {
    console.error('[GoogleSheetsClient] Authenticating with GOOGLE_SERVICE_ACCOUNT_JSON');
    
    let jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
    
    console.error('[GoogleSheetsClient] Environment variable length:', jsonString.length);
    console.error('[GoogleSheetsClient] First 50 chars:', jsonString.substring(0, 50));
    console.error('[GoogleSheetsClient] Last 50 chars:', jsonString.substring(jsonString.length - 50));
    
    // Base64エンコードされている場合はデコード
    let isBase64 = false;
    try {
      // まずJSONとしてパースを試みる
      JSON.parse(jsonString);
      console.error('[GoogleSheetsClient] JSON format detected');
    } catch (e) {
      // パースに失敗した場合、Base64としてデコード
      console.error('[GoogleSheetsClient] Base64 format detected, decoding...');
      isBase64 = true;
      jsonString = Buffer.from(jsonString, 'base64').toString('utf8');
      console.error('[GoogleSheetsClient] Decoded length:', jsonString.length);
      console.error('[GoogleSheetsClient] Decoded first 100 chars:', jsonString.substring(0, 100));
      console.error('[GoogleSheetsClient] Decoded last 100 chars:', jsonString.substring(jsonString.length - 100));
    }
    
    let keyFile;
    try {
      keyFile = JSON.parse(jsonString);
      console.error('[GoogleSheetsClient] ✅ Parsed JSON successfully');
    } catch (parseError: any) {
      console.error('[GoogleSheetsClient] ❌ JSON parse error:', parseError.message);
      console.error('[GoogleSheetsClient] Failed to parse:', jsonString.substring(0, 200));
      throw new Error(`Failed to parse service account JSON: ${parseError.message}`);
    }
    
    console.error('[GoogleSheetsClient] client_email:', keyFile.client_email);
    console.error('[GoogleSheetsClient] project_id:', keyFile.project_id);
    console.error('[GoogleSheetsClient] private_key exists:', !!keyFile.private_key);
    console.error('[GoogleSheetsClient] private_key length:', keyFile.private_key?.length || 0);
    
    // private_keyの改行を復元
    // JSONファイルから読み込んだ場合、private_keyには実際の改行が含まれている
    // しかし、環境変数経由の場合、\nがエスケープされている可能性がある
    if (keyFile.private_key) {
      console.error('[GoogleSheetsClient] Original private_key format:', {
        hasNewlines: keyFile.private_key.includes('\n'),
        hasEscapedNewlines: keyFile.private_key.includes('\\n'),
        startsWithBegin: keyFile.private_key.startsWith('-----BEGIN'),
        length: keyFile.private_key.length,
        first50: keyFile.private_key.substring(0, 50)
      });
      
      if (!keyFile.private_key.includes('\n')) {
        console.error('[GoogleSheetsClient] Replacing escaped newlines in private_key');
        keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
      }
      
      console.error('[GoogleSheetsClient] After newline replacement:', {
        hasNewlines: keyFile.private_key.includes('\n'),
        startsWithBegin: keyFile.private_key.startsWith('-----BEGIN'),
        length: keyFile.private_key.length,
        first50: keyFile.private_key.substring(0, 50)
      });
    } else {
      console.error('[GoogleSheetsClient] ❌ private_key is missing!');
      throw new Error('private_key is missing from service account JSON');
    }

    this.auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    console.error('[GoogleSheetsClient] JWT created, attempting authorization...');
    await this.auth.authorize();
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    console.error('[GoogleSheetsClient] Authentication successful');
  }

  /**
   * サービスアカウント認証を実行（JSONファイルから）
   * Environment Contract準拠: ローカル環境用
   */
  private async authenticateWithServiceAccountFile(): Promise<void> {
    console.error('[GoogleSheetsClient] Authenticating with service account file');
    
    const fs = require('fs');
    const path = require('path');
    
    const keyPath = path.resolve(process.cwd(), this.config.serviceAccountKeyPath!);
    
    console.error('[GoogleSheetsClient] Key file path:', keyPath);
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Service account key file not found: ${keyPath}`);
    }

    // JSONファイルを読み込む
    const keyFileContent = fs.readFileSync(keyPath, 'utf8');
    const keyFile = JSON.parse(keyFileContent);
    
    console.error('[GoogleSheetsClient] Key file loaded:', {
      client_email: keyFile.client_email,
      project_id: keyFile.project_id,
      private_key_id: keyFile.private_key_id,
      has_private_key: !!keyFile.private_key,
      private_key_length: keyFile.private_key?.length || 0
    });

    // JWTクライアントを作成
    this.auth = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
    });

    console.error('[GoogleSheetsClient] JWT client created, authorizing...');
    await this.auth.authorize();
    console.error('[GoogleSheetsClient] Authorization successful');

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    console.error('[GoogleSheetsClient] Authentication successful');
  }

  /**
   * サービスアカウント認証を実行（環境変数から）
   */
  private async authenticateWithServiceAccount(): Promise<void> {
    this.auth = new google.auth.JWT({
      email: this.config.serviceAccountEmail,
      key: this.config.privateKey!.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    await this.auth.authorize();
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * サービスアカウント認証を実行（個別の環境変数から）
   * Environment Contract準拠: Vercel環境用（フォールバック）
   */
  private async authenticateWithServiceAccountEnv(): Promise<void> {
    console.log('[GoogleSheetsClient] Authenticating with GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY');
    
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY!;
    
    // private_keyの改行を復元
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    
    this.auth = new google.auth.JWT({
      email: email,
      key: formattedPrivateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
    });

    await this.auth.authorize();
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    console.log('[GoogleSheetsClient] Authentication successful');
  }

  /**
   * 認証済みかチェック
   */
  private ensureAuthenticated(): void {
    if (!this.sheets || !this.auth) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }

  /**
   * ヘッダー行を取得（キャッシュ付き）
   */
  async getHeaders(): Promise<string[]> {
    if (this.headerCache) {
      return this.headerCache;
    }

    this.ensureAuthenticated();
    const range = `'${this.config.sheetName}'!1:1`;
    
    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range,
    });

    const headers = response.data.values?.[0] || [];
    this.headerCache = headers as string[];
    return this.headerCache;
  }

  /**
   * 行データをオブジェクトに変換
   */
  private async rowToObject(row: any[]): Promise<SheetRow> {
    const headers = await this.getHeaders();
    const obj: SheetRow = {};
    
    headers.forEach((header, index) => {
      const value = row[index];
      obj[header] = value !== undefined && value !== '' ? value : null;
    });
    
    return obj;
  }

  /**
   * オブジェクトを行データに変換
   */
  private async objectToRow(obj: SheetRow): Promise<any[]> {
    const headers = await this.getHeaders();
    return headers.map(header => obj[header] ?? '');
  }

  /**
   * すべてのデータを読み取り（ヘッダー行を除く）
   * 
   * valueRenderOption: 'UNFORMATTED_VALUE' を使用して、
   * 日付セルはシリアル値（数値）として取得します。
   * これにより、表示形式に関係なく正確な年月日を取得できます。
   */
  async readAll(): Promise<SheetRow[]> {
    this.ensureAuthenticated();
    
    return await sheetsRateLimiter.executeRequest(async () => {
      // 範囲を拡大（ZZZまで = 18,278列）
      // シート名をシングルクォートで囲む（日本語対応）
      const range = `'${this.config.sheetName}'!A2:ZZZ`;
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range,
        // UNFORMATTED_VALUE: 日付はシリアル値（数値）として返される
        // これにより表示形式（M/D）に関係なく、正確な年月日を取得できる
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER',
      });

      const rows = response.data.values || [];
      const result: SheetRow[] = [];

      for (const row of rows) {
        result.push(await this.rowToObject(row));
      }

      return result;
    });
  }

  /**
   * 最後の行を取得（高速）
   * 空行をスキップして、実際にデータがある最後の行を返す
   */
  async getLastRow(): Promise<SheetRow | null> {
    this.ensureAuthenticated();
    
    return await sheetsRateLimiter.executeRequest(async () => {
      // 範囲を拡大（ZZZまで = 18,278列）
      const range = `${this.config.sheetName}!A2:ZZZ`;
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return null;
      }

      // 最後の非空行を探す（後ろから検索）
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        // 行に何かデータがあるかチェック
        const hasData = row.some((cell: any) => cell !== undefined && cell !== null && cell !== '');
        if (hasData) {
          return await this.rowToObject(row);
        }
      }

      return null;
    });
  }

  /**
   * 指定範囲のデータを読み取り
   */
  async readRange(range: string): Promise<SheetRow[]> {
    this.ensureAuthenticated();
    
    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range: `${this.config.sheetName}!${range}`,
    });

    const rows = response.data.values || [];
    const result: SheetRow[] = [];

    for (const row of rows) {
      result.push(await this.rowToObject(row));
    }

    return result;
  }

  /**
   * 新しい行を追加
   */
  async appendRow(row: SheetRow): Promise<void> {
    this.ensureAuthenticated();
    
    await sheetsRateLimiter.executeRequest(async () => {
      const values = await this.objectToRow(row);
      const range = `'${this.config.sheetName}'!A:A`;

      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });
    });
  }

  /**
   * 指定行を更新（1-indexed、ヘッダー行は1）
   */
  async updateRow(rowIndex: number, row: SheetRow): Promise<void> {
    this.ensureAuthenticated();
    
    await sheetsRateLimiter.executeRequest(async () => {
      const values = await this.objectToRow(row);
      const range = `'${this.config.sheetName}'!A${rowIndex}:ZZ${rowIndex}`;

      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });
    });
  }

  /**
   * 指定行を削除（1-indexed）
   */
  async deleteRow(rowIndex: number): Promise<void> {
    this.ensureAuthenticated();
    
    // シートIDを取得
    const spreadsheet = await this.sheets!.spreadsheets.get({
      spreadsheetId: this.config.spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      s => s.properties?.title === this.config.sheetName
    );

    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Sheet "${this.config.sheetName}" not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // 行を削除（0-indexed）
    await this.sheets!.spreadsheets.batchUpdate({
      spreadsheetId: this.config.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });
  }

  /**
   * 複数行を一括更新
   */
  async batchUpdate(updates: BatchUpdate[]): Promise<void> {
    this.ensureAuthenticated();
    
    await sheetsRateLimiter.executeRequest(async () => {
      const data: sheets_v4.Schema$ValueRange[] = [];

      for (const update of updates) {
        const values = await this.objectToRow(update.values);
        const range = `'${this.config.sheetName}'!A${update.rowIndex}:ZZ${update.rowIndex}`;
        
        data.push({
          range,
          values: [values],
        });
      }

      await this.sheets!.spreadsheets.values.batchUpdate({
        spreadsheetId: this.config.spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data,
        },
      });
    });
  }

  /**
   * 特定のカラムで値を検索して行番号を取得（1-indexed）
   */
  async findRowByColumn(columnName: string, value: string | number): Promise<number | null> {
    this.ensureAuthenticated();
    
    const headers = await this.getHeaders();
    const columnIndex = headers.indexOf(columnName);
    
    if (columnIndex === -1) {
      throw new Error(`Column "${columnName}" not found in headers`);
    }

    // A=0, B=1, ... Z=25, AA=26, ...
    const columnLetter = this.numberToColumnLetter(columnIndex);
    const range = `'${this.config.sheetName}'!${columnLetter}2:${columnLetter}`;

    const response = await this.sheets!.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range,
    });

    const values = response.data.values || [];
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === value) {
        return i + 2; // +2 because: +1 for header row, +1 for 0-indexed to 1-indexed
      }
    }

    return null;
  }

  /**
   * 数値をカラムレター に変換（0-indexed → A, B, C, ..., Z, AA, AB, ...）
   */
  private numberToColumnLetter(num: number): string {
    let letter = '';
    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 65) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  }

  /**
   * ヘッダーキャッシュをクリア
   */
  clearHeaderCache(): void {
    this.headerCache = null;
  }

  /**
   * 認証オブジェクトを取得
   */
  getAuth(): JWT | any {
    this.ensureAuthenticated();
    return this.auth;
  }

  /**
   * スプレッドシートのメタデータを取得
   */
  async getSpreadsheetMetadata(): Promise<sheets_v4.Schema$Spreadsheet> {
    this.ensureAuthenticated();
    
    const response = await this.sheets!.spreadsheets.get({
      spreadsheetId: this.config.spreadsheetId,
    });

    return response.data;
  }
}
