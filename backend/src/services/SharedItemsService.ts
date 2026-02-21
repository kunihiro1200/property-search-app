import { GoogleSheetsClient, SheetRow } from './GoogleSheetsClient';

export interface SharedItem {
  id: string;
  sharing_location: string;  // D列「共有場」
  sharing_date: string | null;  // P列「共有日」
  staff_not_shared: string | null;  // S列「共有できていない」
  confirmation_date: string | null;  // 確認日
  [key: string]: any;  // その他のカラム
}

export interface SharedItemCategory {
  key: string;
  label: string;
  count: number;
}

export interface Staff {
  name: string;
  is_normal: boolean;
}

/**
 * 社内共有事項管理サービス
 *
 * Google Spreadsheet（ID: 1BuvYd9cKOdgIAy0XhL-voVx1tiGA-cd6MCU_dYvbAQE）の
 * シート「共有」と連携し、社内共有事項を管理します。
 */
export class SharedItemsService {
  private sheetsClient: GoogleSheetsClient;

  constructor() {
    this.sheetsClient = new GoogleSheetsClient({
      spreadsheetId: '1BuvYd9cKOdgIAy0XhL-voVx1tiGA-cd6MCU_dYvbAQE',
      sheetName: '共有',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
    });
  }

  /**
   * 初期化（認証）
   */
  async initialize(): Promise<void> {
    await this.sheetsClient.authenticate();
  }

  /**
   * 全件取得（A2:ZZZから読み取り）
   */
  async getAll(): Promise<SharedItem[]> {
    try {
      const rows = await this.sheetsClient.readAll();
      return rows.map((row, index) => this.mapRowToItem(row, index + 2));
    } catch (error: any) {
      console.error('Failed to fetch shared items:', error);
      throw new Error('共有データの取得に失敗しました');
    }
  }

  /**
   * カテゴリーでフィルタリング
   */
  async getByCategory(category: string): Promise<SharedItem[]> {
    const allItems = await this.getAll();
    return allItems.filter(item => this.calculateCategory(item) === category);
  }

  /**
   * 新規作成（appendRow使用）
   */
  async create(item: Partial<SharedItem>): Promise<SharedItem> {
    try {
      // 行番号が2以上であることを検証
      if (item.id && parseInt(item.id) < 2) {
        throw new Error('Cannot modify header row. Row index must be 2 or greater.');
      }

      await this.sheetsClient.appendRow(item as SheetRow);
      return item as SharedItem;
    } catch (error: any) {
      console.error('Failed to create shared item:', error);
      throw new Error('共有データの作成に失敗しました');
    }
  }

  /**
   * 更新（updateRow使用）
   */
  async update(id: string, updates: Partial<SharedItem>): Promise<SharedItem> {
    try {
      const rowIndex = parseInt(id);

      // 行番号が2以上であることを検証
      if (rowIndex < 2) {
        throw new Error('Cannot modify header row. Row index must be 2 or greater.');
      }

      await this.sheetsClient.updateRow(rowIndex, updates as SheetRow);
      return { ...updates, id } as SharedItem;
    } catch (error: any) {
      console.error('Failed to update shared item:', error);
      throw new Error('共有データの更新に失敗しました');
    }
  }

  /**
   * カテゴリー計算ロジック
   * D列「共有場」からカテゴリーを計算
   */
  calculateCategory(item: SharedItem): string {
    // スタッフ確認カテゴリー: S列「共有できていない」が空でない場合
    if (item.staff_not_shared && !item.confirmation_date) {
      return `${item.staff_not_shared}は要確認`;
    }

    // 基本カテゴリー: D列の値をそのまま使用
    return item.sharing_location || 'その他';
  }

  /**
   * カテゴリー一覧取得
   */
  async getCategories(): Promise<SharedItemCategory[]> {
    const allItems = await this.getAll();
    const categoryMap = new Map<string, number>();

    // カテゴリーごとにアイテムをグループ化
    for (const item of allItems) {
      const category = this.calculateCategory(item);
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }

    // カテゴリー一覧を生成
    const categories: SharedItemCategory[] = [];
    categoryMap.forEach((count, key) => {
      categories.push({
        key,
        label: key,
        count,
      });
    });

    return categories;
  }

  /**
   * ソートロジック
   * P列「共有日」が空のアイテムを先に表示
   * P列「共有日」が入っているアイテムを後に表示（日付降順）
   */
  sortItems(items: SharedItem[]): SharedItem[] {
    return items.sort((a, b) => {
      // 共有日が空のアイテムを先に表示
      if (!a.sharing_date && b.sharing_date) return -1;
      if (a.sharing_date && !b.sharing_date) return 1;

      // 両方とも共有日が空の場合、順序を維持
      if (!a.sharing_date && !b.sharing_date) return 0;

      // 両方とも共有日がある場合、日付降順
      return new Date(b.sharing_date!).getTime() - new Date(a.sharing_date!).getTime();
    });
  }

  /**
   * スタッフ確認追加
   * S列「共有できていない」にスタッフ名を追加
   */
  async addStaffConfirmation(itemId: string, staffName: string): Promise<void> {
    try {
      const rowIndex = parseInt(itemId);

      // 行番号が2以上であることを検証
      if (rowIndex < 2) {
        throw new Error('Cannot modify header row. Row index must be 2 or greater.');
      }

      await this.sheetsClient.updateRow(rowIndex, {
        '共有できていない': staffName,
      } as SheetRow);
    } catch (error: any) {
      console.error('Failed to add staff confirmation:', error);
      throw new Error('スタッフ確認の追加に失敗しました');
    }
  }

  /**
   * スタッフ確認完了
   * 「確認日」に日付を設定
   */
  async markStaffConfirmed(itemId: string, staffName: string): Promise<void> {
    try {
      const rowIndex = parseInt(itemId);

      // 行番号が2以上であることを検証
      if (rowIndex < 2) {
        throw new Error('Cannot modify header row. Row index must be 2 or greater.');
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
      await this.sheetsClient.updateRow(rowIndex, {
        '確認日': today,
      } as SheetRow);
    } catch (error: any) {
      console.error('Failed to mark staff confirmed:', error);
      throw new Error('スタッフ確認完了の設定に失敗しました');
    }
  }

  /**
   * 行データをSharedItemに変換
   */
  private mapRowToItem(row: SheetRow, rowIndex: number): SharedItem {
    // スプレッドシートの全カラムをそのまま含める
    const item: SharedItem = {
      id: rowIndex.toString(),
      sharing_location: (row['共有場'] as string) || '',
      sharing_date: (row['共有日'] as string) || null,
      staff_not_shared: (row['共有できていない'] as string) || null,
      confirmation_date: (row['確認日'] as string) || null,
    };

    // スプレッドシートの全カラムを追加
    Object.keys(row).forEach(key => {
      item[key] = row[key];
    });

    return item;
  }
}
