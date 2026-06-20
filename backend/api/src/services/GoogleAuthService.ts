import { google } from 'googleapis';
import { BaseRepository } from '../repositories/BaseRepository';
import { encrypt, decrypt } from '../utils/encryption';

export interface GoogleCalendarToken {
  id: string;
  employee_id: string;
  encrypted_refresh_token: string;
  token_expiry: string | null;
  scope: string;
  created_at: string;
  updated_at: string;
}

export class GoogleAuthService extends BaseRepository {
  private oauth2Client: any;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.file',  // Google Drive API - アプリが作成したファイルのみアクセス
    'https://www.googleapis.com/auth/gmail.send',  // Gmail API - メール送信
    'https://www.googleapis.com/auth/gmail.compose',  // Gmail API - メール作成
    'https://www.googleapis.com/auth/gmail.settings.basic',  // Gmail API - Send As設定の読み取り
  ];
  private companyAccountId: string | null = null; // 会社アカウント用のemployee ID（動的に取得）

  constructor() {
    super();
    this.initializeOAuthClient();
    this.initializeCompanyAccountId();
  }

  /**
   * 会社アカウント用のemployee IDを初期化（管理者ユーザーを使用）
   */
  private async initializeCompanyAccountId() {
    try {
      // 管理者ユーザーを取得（role='admin'の最初のユーザー）
      const { data, error } = await this.table('employees')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (error || !data) {
        console.warn('⚠️ No admin user found for company calendar account');
        return;
      }

      this.companyAccountId = data.id;
      console.log('✅ Company calendar account ID initialized:', this.companyAccountId);
    } catch (error) {
      console.error('Error initializing company account ID:', error);
    }
  }

  /**
   * 会社アカウントIDを取得（初期化されていない場合は再取得）
   */
  private async getCompanyAccountId(): Promise<string> {
    if (!this.companyAccountId) {
      await this.initializeCompanyAccountId();
    }

    if (!this.companyAccountId) {
      throw new Error('Company calendar account not configured');
    }

    return this.companyAccountId;
  }

  /**
   * OAuth 2.0クライアントを初期化
   */
  private initializeOAuthClient() {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

    console.log('🔍 Google Calendar ENV Check:', {
      clientId: clientId ? '✓ Set' : '✗ Missing',
      clientSecret: clientSecret ? '✓ Set' : '✗ Missing',
      redirectUri: redirectUri ? '✓ Set' : '✗ Missing',
    });

    if (!clientId || !clientSecret || !redirectUri) {
      console.warn(
        '⚠️  Google Calendar API credentials not configured. Calendar features will be disabled.'
      );
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    console.log('✅ Google Calendar API initialized successfully');
  }

  /**
   * OAuth認証URLを生成（会社アカウント用）
   * @returns Google OAuth同意画面のURL
   */
  async getAuthUrl(): Promise<string> {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar API is not configured');
    }

    const accountId = await this.getCompanyAccountId();

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // リフレッシュトークンを取得
      scope: this.SCOPES,
      prompt: 'consent', // 常に同意画面を表示（リフレッシュトークン取得のため）
      state: accountId, // 会社アカウントIDをstateパラメータで渡す
    });
  }

  /**
   * 認証コードをトークンに交換して保存（会社アカウント用）
   * @param code Google OAuth認証コード
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar API is not configured');
    }

    try {
      const accountId = await this.getCompanyAccountId();

      // 認証コードをトークンに交換
      const { tokens } = await this.oauth2Client.getToken(code);

      // refresh_tokenが返ってこない場合は、既存のトークンを確認
      if (!tokens.refresh_token) {
        console.log('⚠️ No refresh token received. Checking existing token...');
        
        // 既存のトークンがあるか確認
        const { data: existingToken } = await this.table(
          'google_calendar_tokens'
        )
          .select('*')
          .eq('employee_id', accountId)
          .single();

        if (existingToken) {
          console.log('✅ Using existing refresh token');
          // 既存のトークンがある場合は、access_tokenのみ更新
          const { error } = await this.table('google_calendar_tokens').update(
            {
              token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
              updated_at: new Date().toISOString(),
            }
          )
          .eq('employee_id', accountId);

          if (error) {
            throw new Error(`Failed to update token: ${error.message}`);
          }

          console.log(`✅ Google Calendar token refreshed for company account`);
          return;
        } else {
          // 既存のトークンもない場合は、ユーザーに再認証を促す
          throw new Error('No refresh token received and no existing token found. Please revoke access in Google account settings and try again.');
        }
      }

      // リフレッシュトークンを暗号化
      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      // データベースに保存（既存のトークンがあれば更新）
      const { error } = await this.table('google_calendar_tokens').upsert(
        {
          employee_id: accountId,
          encrypted_refresh_token: encryptedRefreshToken,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          scope: this.SCOPES.join(' '),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'employee_id',
        }
      );

      if (error) {
        throw new Error(`Failed to save tokens: ${error.message}`);
      }

      console.log(`✅ Google Calendar connected for company account`);

      // Webhook自動登録
      try {
        const { CalendarWebhookService } = await import('./CalendarWebhookService');
        const webhookService = new CalendarWebhookService();
        
        // OAuth2クライアントを取得
        const oauth2Client = await this.getAuthenticatedClient();
        
        // Webhookを登録
        await webhookService.registerWebhook(accountId, oauth2Client);
        console.log(`✅ Webhook registered automatically for company account`);
      } catch (webhookError: any) {
        // Webhook登録失敗はエラーとしない（カレンダー接続は成功）
        console.warn(`⚠️ Failed to register webhook: ${webhookError.message}`);
      }
    } catch (error: any) {
      console.error('Token exchange error:', error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * アクセストークンを取得（必要に応じて更新）- 会社アカウント用
   * @returns アクセストークン
   */
  async getAccessToken(): Promise<string> {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar API is not configured');
    }

    try {
      const accountId = await this.getCompanyAccountId();

      // データベースから会社アカウントのリフレッシュトークンを取得
      const { data: tokenData, error } = await this.table(
        'google_calendar_tokens'
      )
        .select('*')
        .eq('employee_id', accountId)
        .single();

      if (error || !tokenData) {
        throw new Error('GOOGLE_AUTH_REQUIRED');
      }

      // リフレッシュトークンを復号化
      const refreshToken = decrypt(tokenData.encrypted_refresh_token);

      // OAuth クライアントにリフレッシュトークンを設定
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // アクセストークンを取得（自動的に更新される）
      const { token } = await this.oauth2Client.getAccessToken();

      if (!token) {
        throw new Error('GOOGLE_AUTH_REQUIRED');
      }

      return token;
    } catch (error: any) {
      console.error('Get access token error:', error);

      // 認証エラーの場合は特別なエラーコードを返す
      if (
        error.message === 'GOOGLE_AUTH_REQUIRED' ||
        error.message?.includes('invalid_grant') ||
        error.message?.includes('Token has been expired or revoked')
      ) {
        throw new Error('GOOGLE_AUTH_REQUIRED');
      }

      throw error;
    }
  }

  /**
   * Google Calendar連携を解除（会社アカウント用）
   */
  async revokeAccess(): Promise<void> {
    try {
      const accountId = await this.getCompanyAccountId();

      // Webhook自動削除
      try {
        const { CalendarWebhookService } = await import('./CalendarWebhookService');
        const webhookService = new CalendarWebhookService();
        
        // 既存のWebhookを取得
        const channel = await webhookService.getWebhookByEmployeeId(accountId);
        
        if (channel) {
          // OAuth2クライアントを取得
          const oauth2Client = await this.getAuthenticatedClient();
          
          // Webhookを削除
          await webhookService.unregisterWebhook(channel.channel_id, oauth2Client);
          console.log(`✅ Webhook unregistered automatically for company account`);
        }
      } catch (webhookError: any) {
        // Webhook削除失敗は警告として記録
        console.warn(`⚠️ Failed to unregister webhook: ${webhookError.message}`);
      }

      // データベースから会社アカウントのトークンを削除
      const { error } = await this.table('google_calendar_tokens')
        .delete()
        .eq('employee_id', accountId);

      if (error) {
        throw new Error(`Failed to revoke access: ${error.message}`);
      }

      console.log(`✅ Google Calendar disconnected for company account`);
    } catch (error: any) {
      console.error('Revoke access error:', error);
      throw error;
    }
  }

  /**
   * 会社アカウントがGoogle Calendarに接続しているか確認
   * @returns 接続している場合true
   */
  async isConnected(): Promise<boolean> {
    try {
      const accountId = await this.getCompanyAccountId();

      const { data, error } = await this.table('google_calendar_tokens')
        .select('id')
        .eq('employee_id', accountId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * OAuth 2.0クライアントを取得（アクセストークン設定済み）- 会社アカウント用
   * @returns 認証済みOAuth2クライアント
   */
  async getAuthenticatedClient() {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar API is not configured');
    }

    const accountId = await this.getCompanyAccountId();

    // アクセストークンを取得してクライアントに設定
    const accessToken = await this.getAccessToken();

    // 新しいクライアントインスタンスを作成
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // データベースから会社アカウントのリフレッシュトークンを取得
    const { data: tokenData } = await this.table(
      'google_calendar_tokens'
    )
      .select('*')
      .eq('employee_id', accountId)
      .single();

    if (tokenData) {
      const refreshToken = decrypt(tokenData.encrypted_refresh_token);
      client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    return client;
  }
}
