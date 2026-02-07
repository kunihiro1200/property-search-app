import { GoogleSheetsClient } from './GoogleSheetsClient';

/**
 * 買主テンプレートサービス
 * スプレッドシートから買主用のメール・SMSテンプレートを取得
 */
export class BuyerTemplateService {
  private sheetsClient: GoogleSheetsClient;
  private readonly SPREADSHEET_ID = '1sIBMhrarUSMcVWlTVVyaNNKaDxmfrxyHJLWv6U-MZxE';
  private readonly SHEET_NAME = 'テンプレート';

  constructor() {
    this.sheetsClient = new GoogleSheetsClient();
  }

  /**
   * 買主用テンプレートを取得
   * @returns テンプレート一覧
   */
  async getBuyerTemplates(): Promise<BuyerTemplate[]> {
    try {
      // 認証
      await this.sheetsClient.authorize();

      // スプレッドシートからデータを取得
      const range = `${this.SHEET_NAME}!A:F`;
      const values = await this.sheetsClient.getValues(this.SPREADSHEET_ID, range);

      if (!values || values.length === 0) {
        return [];
      }

      // ヘッダー行をスキップ（1行目）
      const dataRows = values.slice(1);

      const templates: BuyerTemplate[] = [];

      for (const row of dataRows) {
        const [id, timestamp, category, type, subject, content] = row;

        // C列（区分）が「買主」のもののみを抽出
        if (category !== '買主') {
          continue;
        }

        // D列（種別）が空の場合はスキップ
        if (!type) {
          continue;
        }

        templates.push({
          id: id || `buyer_${templates.length + 1}`,
          category: category || '買主',
          type: type || '',
          subject: subject || '',
          content: content || '',
        });
      }

      return templates;
    } catch (error) {
      console.error('Failed to fetch buyer templates:', error);
      throw new Error('買主テンプレートの取得に失敗しました');
    }
  }

  /**
   * テンプレート内のプレースホルダーを置換
   * @param template テンプレート文字列
   * @param buyer 買主データ
   * @param employee 担当者データ
   * @returns 置換後の文字列
   */
  replacePlaceholders(
    template: string,
    buyer: any,
    employee?: any
  ): string {
    let result = template;

    // 買主情報の置換
    result = result.replace(/<<氏名>>/g, buyer.name || '');
    result = result.replace(/<<電話番号>>/g, buyer.phone_number || '');
    result = result.replace(/<<メールアドレス>>/g, buyer.email || '');
    result = result.replace(/<<買主番号>>/g, buyer.buyer_number || '');

    // 担当者情報の置換
    if (employee) {
      result = result.replace(/<<担当者名>>/g, employee.name || '');
      result = result.replace(/<<担当者電話番号>>/g, employee.phoneNumber || '');
      result = result.replace(/<<担当者メールアドレス>>/g, employee.email || '');
    }

    // 会社情報の置換
    result = result.replace(/<<会社名>>/g, '株式会社アットホーム');
    result = result.replace(/<<住所>>/g, '〒874-0000 大分県別府市○○町1-1-1');
    result = result.replace(/<<会社電話番号>>/g, '0977-00-0000');
    result = result.replace(/<<会社メールアドレス>>/g, 'info@athome-beppu.com');

    return result;
  }

  /**
   * SMS用に署名を簡略化
   * @param content 本文
   * @returns 簡略化された本文
   */
  simplifySmsSignature(content: string): string {
    // 署名部分を簡略化（最後の署名欄を会社名、住所、電話番号、メアドのみに）
    // 例: 複数行の署名を1行にまとめる
    let result = content;

    // 署名の簡略化パターン（必要に応じて調整）
    const signaturePattern = /---+\s*\n([\s\S]*?)$/;
    const match = result.match(signaturePattern);

    if (match) {
      // 署名部分を簡略化
      const simplifiedSignature = `
---
<<会社名>>
<<住所>>
TEL: <<会社電話番号>>
Email: <<会社メールアドレス>>`;

      result = result.replace(signaturePattern, simplifiedSignature);
    }

    return result;
  }
}

/**
 * 買主テンプレート型定義
 */
export interface BuyerTemplate {
  id: string;
  category: string; // 区分（買主）
  type: string; // 種別（D列）
  subject: string; // 件名（E列、メールの場合のみ）
  content: string; // 本文（F列）
}
