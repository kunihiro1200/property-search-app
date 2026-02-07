import axios, { AxiosError } from 'axios';

/**
 * Google Chatメッセージの構造
 */
interface GoogleChatMessage {
  text: string;
}

/**
 * メッセージ送信結果
 */
export interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * Google Chat Webhook APIへのメッセージ送信を担当するサービス
 * 
 * Requirements: 4.1
 */
export class GoogleChatService {
  private readonly timeout: number = 10000; // 10秒

  /**
   * Google ChatにメッセージをPOST
   * 
   * @param webhookUrl - Webhook URL
   * @param message - 送信するメッセージ
   * @returns 送信結果
   * 
   * Requirements: 4.1
   */
  async sendMessage(
    webhookUrl: string,
    message: string
  ): Promise<SendMessageResult> {
    try {
      // Webhook URLの基本的なバリデーション
      if (!webhookUrl || !this.isValidWebhookUrl(webhookUrl)) {
        return {
          success: false,
          error: '無効なWebhook URLです'
        };
      }

      // メッセージが空でないことを確認
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'メッセージが空です'
        };
      }

      // Google Chat APIにPOSTリクエストを送信
      const payload: GoogleChatMessage = {
        text: message
      };

      const response = await axios.post(webhookUrl, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // 成功レスポンス（2xx）
      if (response.status >= 200 && response.status < 300) {
        console.log('[GoogleChatService] Message sent successfully:', {
          status: response.status,
          timestamp: new Date().toISOString()
        });

        return {
          success: true
        };
      }

      // 予期しないステータスコード
      return {
        success: false,
        error: `予期しないレスポンス: ${response.status}`
      };

    } catch (error: any) {
      // エラーハンドリング
      return this.handleError(error);
    }
  }

  /**
   * Webhook URLの妥当性を検証
   * 
   * @param url - 検証するURL
   * @returns URLが有効な場合はtrue
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Google Chat Webhook URLの基本的な形式チェック
      // https://chat.googleapis.com/v1/spaces/... の形式
      return (
        parsedUrl.protocol === 'https:' &&
        parsedUrl.hostname === 'chat.googleapis.com' &&
        parsedUrl.pathname.startsWith('/v1/spaces/')
      );
    } catch {
      return false;
    }
  }

  /**
   * エラーを処理して適切なエラーメッセージを返す
   * 
   * @param error - キャッチされたエラー
   * @returns 送信結果（エラー）
   */
  private handleError(error: any): SendMessageResult {
    // Axiosエラーの場合
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // タイムアウトエラー
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        console.error('[GoogleChatService] Timeout error:', {
          error: axiosError.message,
          timestamp: new Date().toISOString()
        });

        return {
          success: false,
          error: 'メッセージの送信がタイムアウトしました'
        };
      }

      // ネットワークエラー
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        console.error('[GoogleChatService] Network error:', {
          code: axiosError.code,
          error: axiosError.message,
          timestamp: new Date().toISOString()
        });

        return {
          success: false,
          error: 'ネットワークエラーが発生しました'
        };
      }

      // HTTPエラーレスポンス（4xx, 5xx）
      if (axiosError.response) {
        const status = axiosError.response.status;
        const statusText = axiosError.response.statusText;

        console.error('[GoogleChatService] HTTP error:', {
          status,
          statusText,
          data: axiosError.response.data,
          timestamp: new Date().toISOString()
        });

        // 4xxエラー（クライアントエラー）
        if (status >= 400 && status < 500) {
          return {
            success: false,
            error: `メッセージの送信に失敗しました: ${statusText} (${status})`
          };
        }

        // 5xxエラー（サーバーエラー）
        if (status >= 500) {
          return {
            success: false,
            error: `Google Chatサーバーエラー: ${statusText} (${status})`
          };
        }
      }

      // その他のAxiosエラー
      console.error('[GoogleChatService] Axios error:', {
        error: axiosError.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `メッセージの送信に失敗しました: ${axiosError.message}`
      };
    }

    // その他の予期しないエラー
    console.error('[GoogleChatService] Unexpected error:', {
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: `予期しないエラーが発生しました: ${error.message || error}`
    };
  }
}
