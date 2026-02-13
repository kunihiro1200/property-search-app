import { GoogleSheetsClient } from './GoogleSheetsClient';

export interface StaffMember {
  name: string;
  chatAddress?: string;
}

export class StaffService {
  private sheetsClient: GoogleSheetsClient;
  private readonly SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
  private readonly SHEET_NAME = 'スタッフ';

  constructor() {
    this.sheetsClient = new GoogleSheetsClient({
      spreadsheetId: this.SPREADSHEET_ID,
      sheetName: this.SHEET_NAME,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
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
        const name = (row['姓名'] as string) || (row['氏名'] as string) || (row['名前'] as string);
        if (name === staffName) {
          return (row['Chat webhook'] as string) || (row['Chat'] as string) || (row['Chatアドレス'] as string) || null;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch staff chat address:', error);
      throw error;
    }
  }

  /**
   * メールアドレスからスタッフ情報を取得
   * @param email メールアドレス
   * @returns スタッフ情報
   */
  async getStaffByEmail(email: string): Promise<StaffMember | null> {
    try {
      console.log('[StaffService] getStaffByEmail called with email:', email);
      await this.sheetsClient.authenticate();
      const rows = await this.sheetsClient.readAll();

      console.log('[StaffService] Total rows fetched:', rows?.length || 0);
      
      // 最初の行のカラム名をログ出力
      if (rows && rows.length > 0) {
        console.log('[StaffService] Available columns:', Object.keys(rows[0]));
      }

      if (!rows || rows.length === 0) {
        console.warn('[StaffService] No rows found in staff sheet');
        return null;
      }

      // メールアドレスで検索
      for (const row of rows) {
        const rowEmail = (row['メールアドレス'] as string) || (row['メアド'] as string) || (row['email'] as string);
        if (rowEmail && rowEmail.toLowerCase() === email.toLowerCase()) {
          const name = (row['姓名'] as string) || (row['氏名'] as string) || (row['名前'] as string) || (row['name'] as string);
          const chatAddress = (row['Chat webhook'] as string) || (row['Chat'] as string) || (row['Chatアドレス'] as string) || (row['chat'] as string);
          
          console.log('[StaffService] Row data:', row);
          console.log('[StaffService] Staff found:', { name, chatAddress, email: rowEmail });
          
          return {
            name: name || '',
            chatAddress: chatAddress || undefined,
          };
        }
      }

      console.warn('[StaffService] No staff found for email:', email);
      return null;
    } catch (error) {
      console.error('[StaffService] Failed to fetch staff by email:', error);
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
        const name = (row['姓名'] as string) || (row['氏名'] as string) || (row['名前'] as string);
        const chatAddress = (row['Chat webhook'] as string) || (row['Chat'] as string) || (row['Chatアドレス'] as string);
        
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
