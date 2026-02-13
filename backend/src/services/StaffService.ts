import { GoogleSheetsClient } from './GoogleSheetsClient';

export interface StaffMember {
  name: string;
  chatAddress?: string;
}

export class StaffService {
  private sheetsClient: GoogleSheetsClient;
  private readonly SPREADSHEET_ID = '1sIBMhrarUSMcVWlTVVyaNNKaDxmfrxyHJLWv6U-MZxE';
  private readonly SHEET_NAME = 'スタッフ';

  constructor() {
    this.sheetsClient = new GoogleSheetsClient({
      spreadsheetId: this.SPREADSHEET_ID,
      sheetName: this.SHEET_NAME,
    });
  }

  /**
   * スタッフのChatアドレスを取得
   * @param staffName スタッフ名
   * @returns Chatアドレス
   */
  async getChatAddress(staffName: string): Promise<string | null> {
    try {
      await this.sheetsClient.authenticate();
      const rows = await this.sheetsClient.readAll();

      if (!rows || rows.length === 0) {
        return null;
      }

      // スタッフ名で検索
      for (const row of rows) {
        if (row['氏名'] === staffName || row['名前'] === staffName) {
          return (row['Chat'] as string) || (row['Chatアドレス'] as string) || null;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch staff chat address:', error);
      throw error;
    }
  }

  /**
   * 全スタッフ情報を取得
   * @returns スタッフ一覧
   */
  async getAllStaff(): Promise<StaffMember[]> {
    try {
      await this.sheetsClient.authenticate();
      const rows = await this.sheetsClient.readAll();

      if (!rows || rows.length === 0) {
        return [];
      }

      const staff: StaffMember[] = [];
      for (const row of rows) {
        const name = (row['氏名'] as string) || (row['名前'] as string);
        const chatAddress = (row['Chat'] as string) || (row['Chatアドレス'] as string);
        
        if (name) {
          staff.push({
            name,
            chatAddress: chatAddress || undefined,
          });
        }
      }

      return staff;
    } catch (error) {
      console.error('Failed to fetch staff list:', error);
      throw error;
    }
  }
}
