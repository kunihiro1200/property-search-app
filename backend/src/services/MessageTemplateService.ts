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
    this.sheetsClient = new GoogleSheetsClient();
  }

  /**
   * メッセージテンプレートを取得
   * @param category 区分（例: "物件"）
   * @returns テンプレートの配列
   */
  async getTemplates(category: string = '物件'): Promise<MessageTemplate[]> {
    try {
      const rows = await this.sheetsClient.getSheetData(
        this.SPREADSHEET_ID,
        this.SHEET_NAME
      );

      if (!rows || rows.length === 0) {
        return [];
      }

      // ヘッダー行を取得
      const headers = rows[0];
      const categoryIndex = headers.indexOf('区分');
      const typeIndex = headers.indexOf('種別');
      const subjectIndex = headers.indexOf('件名');
      const bodyIndex = headers.indexOf('本文');

      if (categoryIndex === -1 || typeIndex === -1 || subjectIndex === -1 || bodyIndex === -1) {
        console.error('Required columns not found in template sheet');
        return [];
      }

      // データ行をフィルタリング
      const templates: MessageTemplate[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[categoryIndex] === category) {
          templates.push({
            category: row[categoryIndex] || '',
            type: row[typeIndex] || '',
            subject: row[subjectIndex] || '',
            body: row[bodyIndex] || '',
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
