import { GoogleSheetsClient } from './GoogleSheetsClient';

export interface MessageTemplate {
  category: string;
  type: string;
  subject: string;
  body: string;
}

export class MessageTemplateService {
  private sheetsClient: GoogleSheetsClient;
  private readonly SPREADSHEET_ID = '1sIBMhrarUSMcVWlTVVyaNNKaDxmfrxyHJLWv6U-MZxE';
  private readonly SHEET_NAME = 'テンプレート';

  constructor() {
    this.sheetsClient = new GoogleSheetsClient({
      spreadsheetId: this.SPREADSHEET_ID,
      sheetName: this.SHEET_NAME,
    });
  }

  /**
   * メッセージテンプレートを取得
   * @param category 区分（例: "物件"）
   * @returns テンプレートの配列
   */
  async getTemplates(category: string = '物件'): Promise<MessageTemplate[]> {
    try {
      await this.sheetsClient.authenticate();
      const rows = await this.sheetsClient.readAll();

      if (!rows || rows.length === 0) {
        return [];
      }

      // データ行をフィルタリング
      const templates: MessageTemplate[] = [];
      for (const row of rows) {
        if (row['区分'] === category) {
          templates.push({
            category: (row['区分'] as string) || '',
            type: (row['種別'] as string) || '',
            subject: (row['件名'] as string) || '',
            body: (row['本文'] as string) || '',
          });
        }
      }

      return templates;
    } catch (error) {
      console.error('Failed to fetch message templates:', error);
      throw error;
    }
  }

  /**
   * 特定の種別のテンプレートを取得
   * @param category 区分
   * @param type 種別
   * @returns テンプレート
   */
  async getTemplateByType(category: string, type: string): Promise<MessageTemplate | null> {
    try {
      const templates = await this.getTemplates(category);
      return templates.find(t => t.type === type) || null;
    } catch (error) {
      console.error('Failed to fetch template by type:', error);
      throw error;
    }
  }
}
