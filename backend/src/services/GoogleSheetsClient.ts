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
    this.config = config;
  }

  /**
   * 認証を実行（Environment Contract準拠）
   * 優先順位: GOOGLE_SERVICE_ACCOUNT_JSON > serviceAccountKeyPath > OAuth 2.0
   */
  async authenticate(): Promise<void> {
    try {
      console.log('[GoogleSheetsClient] Starting authentication...');
      console.log('[GoogleSheetsClient] Environment check:', {
        hasGoogleServiceAccountJson: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        hasServiceAccountKeyPath: !!this.config.serviceAccountKeyPath,
        hasServiceAccountEmail: !!this.config.serviceAccountEmail,
        hasOAuthCredentials: !!(this.config.clientId && this.config.clientSecret && this.config.refreshToken),
      });
      
      // 1. 環境変数からJSON読み込み（Vercel環境用）
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.log('[GoogleSheetsClient] Using GOOGLE_SERVICE_ACCOUNT_JSON');
        await this.authenticateWithServiceAccountJson();
      }
      // 2. JSONファイルから読み込み（ローカル環境用）
      else if (this.config.serviceAccountKeyPath) {
        console.log('[GoogleSheetsClient] Using serviceAccountKeyPath');
        await this.authenticateWithServiceAccountFile();
      }
      // 3. 個別の環境変数から読み込み
      else if (this.config.serviceAccountEmail && this.config.privateKey) {
        console.log('[GoogleSheetsClient] Using serviceAccountEmail and privateKey');
        await this.authenticateWithServiceAccount();
      } 
      // 4. OAuth 2.0認証（フォールバック）
      else if (this.config.clientId && this.config.clientSecret && this.config.refreshToken) {
        console.log('[GoogleSheetsClient] Using OAuth 2.0');
        await this.authenticateWithOAuth();
      } 
      else {
        throw new Error('No valid authentication credentials provided');
      }
      
      console.log('[GoogleSheetsClient] Authentication completed successfully');
    } catch (error: any) {
      console.error('[GoogleSheetsClient] Authentication failed:', error.message);
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
    console.log('[GoogleSheetsClient] Authenticating with GOOGLE_SERVICE_ACCOUNT_JSON');
    console.log('[GoogleSheetsClient] JSON length:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0);
    
    try {
      const keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
      console.log('[GoogleSheetsClient] JSON parsed successfully');
      console.log('[GoogleSheetsClient] Key file keys:', Object.keys(keyFile));
      
      // ⚠️ 重要：private_keyの\\nを実際の改行に変換
      if (keyFile.private_key) {
        const beforeLength = keyFile.private_key.length;
        const beforeNewlineCount = (keyFile.private_key.match(/\\n/g) || []).length;
        
        keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
        
        const afterLength = keyFile.private_key.length;
        const afterNewlineCount = (keyFile.private_key.match(/\n/g) || []).length;
        
        console.log('[GoogleSheetsClient] ✅ Converted \\\\n to actual newlines in private_key');
        console.log('[GoogleSheetsClient] Before:', { length: beforeLength, newlineCount: beforeNewlineCount });
        console.log('[GoogleSheetsClient] After:', { length: afterLength, newlineCount: afterNewlineCount });
      } else {
        console.error('[GoogleSheetsClient] ❌ private_key not found in key file');
      }

      this.auth = new google.auth.JWT({
        email: keyFile.client_email,
        key: keyFile.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      console.log('[GoogleSheetsClient] JWT created, calling authorize()...');
      await this.auth.authorize();
      console.log('[GoogleSheetsClient] JWT authorized successfully');
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('[GoogleSheetsClient] Authentication successful');
    } catch (error: any) {
      console.error('[GoogleSheetsClient] Authentication error:', error.message);
      console.error('[GoogleSheetsClient] Error code:', error.code);
      console.error('[GoogleSheetsClient] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * サービスアカウント認証を実行（JSONファイルから）
   * Environment Contract準拠: ローカル環境用
   */
  private async authenticateWithServiceAccountFile(): Promise<void> {
    console.log('[GoogleSheetsClient] Authenticating with service account file');
    
    const fs = require('fs');
    const path = require('path');
    
    const keyPath = path.resolve(process.cwd(), this.config.serviceAccountKeyPath!);
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Service account key file not found: ${keyPath}`);
    }

    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    this.auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    await this.auth.authorize();
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    console.log('[GoogleSheetsClient] Authentication successful');
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
    const range = `${this.config.sheetName}!1:1`;
    
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
   */
  async readAll(): Promise<SheetRow[]> {
    this.ensureAuthenticated();
    
    return await sheetsRateLimiter.executeRequest(async () => {
      // 範囲を拡大（ZZZまで = 18,278列）
      const range = `${this.config.sheetName}!A2:ZZZ`;
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range,
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
    
    console.log('[GoogleSheetsClient] getLastRow() called');
    console.log('[GoogleSheetsClient] Config:', {
      spreadsheetId: this.config.spreadsheetId,
      sheetName: this.config.sheetName,
    });
    
    return await sheetsRateLimiter.executeRequest(async () => {
      // 範囲を拡大（ZZZまで = 18,278列）
      const range = `${this.config.sheetName}!A2:ZZZ`;
      
      console.log('[GoogleSheetsClient] Calling sheets.spreadsheets.values.get()...');
      console.log('[GoogleSheetsClient] Parameters:', {
        spreadsheetId: this.config.spreadsheetId,
        range,
      });
      
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range,
      });

      console.log('[GoogleSheetsClient] Response received, rows count:', response.data.values?.length || 0);

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log('[GoogleSheetsClient] No rows found');
        return null;
      }

      // 最後の非空行を探す（後ろから検索）
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        // 行に何かデータがあるかチェック
        const hasData = row.some((cell: any) => cell !== undefined && cell !== null && cell !== '');
        if (hasData) {
          console.log('[GoogleSheetsClient] Found last row at index:', i);
          return await this.rowToObject(row);
        }
      }

      console.log('[GoogleSheetsClient] No non-empty rows found');
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
