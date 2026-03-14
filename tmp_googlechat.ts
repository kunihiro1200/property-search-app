import axios, { AxiosError } from 'axios';

/**
 * Google Chat繝｡繝・そ繝ｼ繧ｸ縺ｮ讒矩
 */
interface GoogleChatMessage {
  text: string;
}

/**
 * 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡邨先棡
 */
export interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * Google Chat Webhook API縺ｸ縺ｮ繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡繧呈球蠖薙☆繧九し繝ｼ繝薙せ
 * 
 * Requirements: 4.1
 */
export class GoogleChatService {
  private readonly timeout: number = 10000; // 10遘・
  /**
   * Google Chat縺ｫ繝｡繝・そ繝ｼ繧ｸ繧単OST
   * 
   * @param webhookUrl - Webhook URL
   * @param message - 騾∽ｿ｡縺吶ｋ繝｡繝・そ繝ｼ繧ｸ
   * @returns 騾∽ｿ｡邨先棡
   * 
   * Requirements: 4.1
   */
  async sendMessage(
    webhookUrl: string,
    message: string
  ): Promise<SendMessageResult> {
    try {
      // Webhook URL縺ｮ蝓ｺ譛ｬ逧・↑繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      if (!webhookUrl || !this.isValidWebhookUrl(webhookUrl)) {
        return {
          success: false,
          error: '辟｡蜉ｹ縺ｪWebhook URL縺ｧ縺・
        };
      }

      // 繝｡繝・そ繝ｼ繧ｸ縺檎ｩｺ縺ｧ縺ｪ縺・％縺ｨ繧堤｢ｺ隱・      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: '繝｡繝・そ繝ｼ繧ｸ縺檎ｩｺ縺ｧ縺・
        };
      }

      // Google Chat API縺ｫPOST繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡
      const payload: GoogleChatMessage = {
        text: message
      };

      const response = await axios.post(webhookUrl, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ・・xx・・      if (response.status >= 200 && response.status < 300) {
        console.log('[GoogleChatService] Message sent successfully:', {
          status: response.status,
          timestamp: new Date().toISOString()
        });

        return {
          success: true
        };
      }

      // 莠域悄縺励↑縺・せ繝・・繧ｿ繧ｹ繧ｳ繝ｼ繝・      return {
        success: false,
        error: `莠域悄縺励↑縺・Ξ繧ｹ繝昴Φ繧ｹ: ${response.status}`
      };

    } catch (error: any) {
      // 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
      return this.handleError(error);
    }
  }

  /**
   * Webhook URL縺ｮ螯･蠖捺ｧ繧呈､懆ｨｼ
   * 
   * @param url - 讀懆ｨｼ縺吶ｋURL
   * @returns URL縺梧怏蜉ｹ縺ｪ蝣ｴ蜷医・true
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Google Chat Webhook URL縺ｮ蝓ｺ譛ｬ逧・↑蠖｢蠑上メ繧ｧ繝・け
      // https://chat.googleapis.com/v1/spaces/... 縺ｮ蠖｢蠑・      return (
        parsedUrl.protocol === 'https:' &&
        parsedUrl.hostname === 'chat.googleapis.com' &&
        parsedUrl.pathname.startsWith('/v1/spaces/')
      );
    } catch {
      return false;
    }
  }

  /**
   * 繧ｨ繝ｩ繝ｼ繧貞・逅・＠縺ｦ驕ｩ蛻・↑繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定ｿ斐☆
   * 
   * @param error - 繧ｭ繝｣繝・メ縺輔ｌ縺溘お繝ｩ繝ｼ
   * @returns 騾∽ｿ｡邨先棡・医お繝ｩ繝ｼ・・   */
  private handleError(error: any): SendMessageResult {
    // Axios繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷・    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // 繧ｿ繧､繝繧｢繧ｦ繝医お繝ｩ繝ｼ
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        console.error('[GoogleChatService] Timeout error:', {
          error: axiosError.message,
          timestamp: new Date().toISOString()
        });

        return {
          success: false,
          error: '繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺後ち繧､繝繧｢繧ｦ繝医＠縺ｾ縺励◆'
        };
      }

      // 繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｨ繝ｩ繝ｼ
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        console.error('[GoogleChatService] Network error:', {
          code: axiosError.code,
          error: axiosError.message,
          timestamp: new Date().toISOString()
        });

        return {
          success: false,
          error: '繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        };
      }

      // HTTP繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ・・xx, 5xx・・      if (axiosError.response) {
        const status = axiosError.response.status;
        const statusText = axiosError.response.statusText;

        console.error('[GoogleChatService] HTTP error:', {
          status,
          statusText,
          data: axiosError.response.data,
          timestamp: new Date().toISOString()
        });

        // 4xx繧ｨ繝ｩ繝ｼ・医け繝ｩ繧､繧｢繝ｳ繝医お繝ｩ繝ｼ・・        if (status >= 400 && status < 500) {
          return {
            success: false,
            error: `繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${statusText} (${status})`
          };
        }

        // 5xx繧ｨ繝ｩ繝ｼ・医し繝ｼ繝舌・繧ｨ繝ｩ繝ｼ・・        if (status >= 500) {
          return {
            success: false,
            error: `Google Chat繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ: ${statusText} (${status})`
          };
        }
      }

      // 縺昴・莉悶・Axios繧ｨ繝ｩ繝ｼ
      console.error('[GoogleChatService] Axios error:', {
        error: axiosError.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${axiosError.message}`
      };
    }

    // 縺昴・莉悶・莠域悄縺励↑縺・お繝ｩ繝ｼ
    console.error('[GoogleChatService] Unexpected error:', {
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: `莠域悄縺励↑縺・お繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${error.message || error}`
    };
  }
}
