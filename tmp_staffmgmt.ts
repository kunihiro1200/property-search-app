import { GoogleSheetsClient } from './GoogleSheetsClient';

/**
 * 繧ｹ繧ｿ繝・ヵ諠・ｱ
 */
export interface StaffInfo {
  initials: string;
  name: string;
  chatWebhook: string | null;
}

/**
 * Webhook URL蜿門ｾ礼ｵ先棡
 */
export interface GetWebhookUrlResult {
  success: boolean;
  webhookUrl?: string;
  error?: string;
}

/**
 * 繧ｹ繧ｿ繝・ヵ邂｡逅・し繝ｼ繝薙せ
 * 
 * 繧ｹ繧ｿ繝・ヵ邂｡逅・せ繝励Ξ繝・ラ繧ｷ繝ｼ繝医°繧峨せ繧ｿ繝・ヵ諠・ｱ繧貞叙蠕励＠縲・ * 諡・ｽ楢・錐縺九ｉGoogle Chat Webhook URL繧貞叙蠕励＠縺ｾ縺吶・ * 
 * 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝域ｧ矩:
 * - A蛻・ 繧､繝九す繝｣繝ｫ
 * - C蛻・ 蜷榊燕
 * - F蛻・ Chat webhook
 * 
 * 繧ｭ繝｣繝・す繝･讖溯・:
 * - 繧ｹ繧ｿ繝・ヵ諠・ｱ繧・0蛻・俣繧ｭ繝｣繝・す繝･
 * - 謇句虚縺ｧ繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢蜿ｯ閭ｽ
 */
export class StaffManagementService {
  private cache: Map<string, StaffInfo> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 60蛻・  private readonly SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
  private readonly SHEET_NAME = '繧ｹ繧ｿ繝・ヵ';

  /**
   * 諡・ｽ楢・錐縺九ｉWebhook URL繧貞叙蠕・   * 
   * @param assigneeName - 諡・ｽ楢・錐・医う繝九す繝｣繝ｫ縺ｾ縺溘・蜷榊燕・・   * @returns Webhook URL蜿門ｾ礼ｵ先棡
   * 
   * 讀懃ｴ｢繝ｭ繧ｸ繝・け:
   * 1. 繧､繝九す繝｣繝ｫ・・蛻暦ｼ峨〒螳悟・荳閾ｴ讀懃ｴ｢
   * 2. 蜷榊燕・・蛻暦ｼ峨〒螳悟・荳閾ｴ讀懃ｴ｢
   * 3. 縺ｩ縺｡繧峨ｂ荳閾ｴ縺励↑縺・ｴ蜷医・繧ｨ繝ｩ繝ｼ
   * 
   * 繧ｨ繝ｩ繝ｼ繧ｱ繝ｼ繧ｹ:
   * - 諡・ｽ楢・′隕九▽縺九ｉ縺ｪ縺・ "諡・ｽ楢・′隕九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆"
   * - Webhook URL縺檎ｩｺ: "諡・ｽ楢・・Chat webhook URL縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ"
   * - 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医い繧ｯ繧ｻ繧ｹ繧ｨ繝ｩ繝ｼ: "繧ｹ繧ｿ繝・ヵ諠・ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆"
   */
  async getWebhookUrl(assigneeName: string): Promise<GetWebhookUrlResult> {
    try {
      // 繧ｹ繧ｿ繝・ヵ繝・・繧ｿ繧貞叙蠕暦ｼ医く繝｣繝・す繝･莉倥″・・      const staffData = await this.fetchStaffData();

      // 繧､繝九す繝｣繝ｫ縺ｾ縺溘・蜷榊燕縺ｧ讀懃ｴ｢
      const staff = staffData.find(
        s => s.initials === assigneeName || s.name === assigneeName
      );

      if (!staff) {
        return {
          success: false,
          error: '諡・ｽ楢・′隕九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆'
        };
      }

      if (!staff.chatWebhook) {
        return {
          success: false,
          error: '諡・ｽ楢・・Chat webhook URL縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ'
        };
      }

      return {
        success: true,
        webhookUrl: staff.chatWebhook
      };
    } catch (error: any) {
      console.error('[StaffManagementService] Error getting webhook URL:', {
        assigneeName,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: '繧ｹ繧ｿ繝・ヵ諠・ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆'
      };
    }
  }

  /**
   * 繧ｹ繧ｿ繝・ヵ邂｡逅・せ繝励Ξ繝・ラ繧ｷ繝ｼ繝医°繧峨ョ繝ｼ繧ｿ繧貞叙蠕・   * 
   * @returns 繧ｹ繧ｿ繝・ヵ諠・ｱ縺ｮ驟榊・
   * 
   * 繧ｭ繝｣繝・す繝･讖溯・:
   * - 60蛻・俣繧ｭ繝｣繝・す繝･
   * - 繧ｭ繝｣繝・す繝･縺梧怏蜉ｹ縺ｪ蝣ｴ蜷医・縲√せ繝励Ξ繝・ラ繧ｷ繝ｼ繝医↓繧｢繧ｯ繧ｻ繧ｹ縺励↑縺・   * 
   * 繧ｫ繝ｩ繝繝槭ャ繝斐Φ繧ｰ:
   * - A蛻・ 繧､繝九す繝｣繝ｫ
   * - C蛻・ 蜷榊燕
   * - F蛻・ Chat webhook
   */
  private async fetchStaffData(): Promise<StaffInfo[]> {
    // 繧ｭ繝｣繝・す繝･縺梧怏蜉ｹ縺ｪ蝣ｴ蜷医・縲√く繝｣繝・す繝･縺九ｉ霑斐☆
    const now = Date.now();
    if (this.cache.size > 0 && now < this.cacheExpiry) {
      console.log('[StaffManagementService] Using cached staff data');
      return Array.from(this.cache.values());
    }

    console.log('[StaffManagementService] Fetching staff data from spreadsheet');

    // GoogleSheetsClient繧貞・譛溷喧
    const client = new GoogleSheetsClient({
      spreadsheetId: this.SPREADSHEET_ID,
      sheetName: this.SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
    });

    // 隱崎ｨｼ
    await client.authenticate();

    // 蜈ｨ繝・・繧ｿ繧貞叙蠕・    const rows = await client.readAll();

    // 繧ｹ繧ｿ繝・ヵ諠・ｱ縺ｫ螟画鋤
    const staffData: StaffInfo[] = [];
    for (const row of rows) {
      // B蛻暦ｼ医う繝九す繝｣繝ｫ・峨，蛻暦ｼ亥錐蟄暦ｼ峨：蛻暦ｼ・hat webhook・峨ｒ蜿門ｾ・      const initials = row['繧､繝九す繝｣繝ｫ'] as string;
      const name = row['蜷榊ｭ・] as string; // 縲悟錐蜑阪阪〒縺ｯ縺ｪ縺上悟錐蟄励・      const chatWebhook = row['Chat webhook'] as string | null;

      // 繧､繝九す繝｣繝ｫ縺ｾ縺溘・蜷榊燕縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺ｿ霑ｽ蜉
      if (initials || name) {
        const staff: StaffInfo = {
          initials: initials || '',
          name: name || '',
          chatWebhook: chatWebhook || null
        };
        staffData.push(staff);

        // 繧ｭ繝｣繝・す繝･縺ｫ霑ｽ蜉・医う繝九す繝｣繝ｫ縺ｨ蜷榊燕縺ｮ荳｡譁ｹ繧偵く繝ｼ縺ｫ縺吶ｋ・・        if (initials) {
          this.cache.set(initials, staff);
        }
        if (name) {
          this.cache.set(name, staff);
        }
      }
    }

    // 繧ｭ繝｣繝・す繝･縺ｮ譛牙柑譛滄剞繧定ｨｭ螳・    this.cacheExpiry = now + this.CACHE_DURATION_MS;

    console.log('[StaffManagementService] Fetched staff data:', {
      count: staffData.length,
      cacheExpiry: new Date(this.cacheExpiry).toISOString()
    });

    return staffData;
  }

  /**
   * 繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢
   * 
   * 謇句虚蜷梧悄譎ゅｄ繝・せ繝域凾縺ｫ菴ｿ逕ｨ縺励∪縺吶・   */
  clearCache(): void {
    console.log('[StaffManagementService] Clearing cache');
    this.cache.clear();
    this.cacheExpiry = 0;
  }
}
