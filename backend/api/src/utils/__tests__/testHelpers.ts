/**
 * テストヘルパーユーティリティ
 * プロパティベーステストとユニットテストで使用する共通ヘルパー関数
 */

/**
 * 2つのオブジェクトが等しいかチェック（日付とUUIDを除く）
 */
export const areObjectsEqualExcludingDatesAndIds = <T extends Record<string, any>>(
  obj1: T,
  obj2: T,
  excludeFields: string[] = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']
): boolean => {
  const keys1 = Object.keys(obj1).filter(k => !excludeFields.includes(k));
  const keys2 = Object.keys(obj2).filter(k => !excludeFields.includes(k));

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * 配列内の要素がすべて一意かチェック
 */
export const areAllUnique = <T>(arr: T[], keyFn: (item: T) => any = (x) => x): boolean => {
  const keys = arr.map(keyFn);
  return keys.length === new Set(keys).size;
};

/**
 * 配列が時系列順（降順）にソートされているかチェック
 */
export const isChronologicallySorted = (dates: Date[]): boolean => {
  for (let i = 0; i < dates.length - 1; i++) {
    if (dates[i].getTime() < dates[i + 1].getTime()) {
      return false;
    }
  }
  return true;
};

/**
 * 文字列が指定されたパターンにマッチするかチェック
 */
export const matchesPattern = (str: string, pattern: RegExp): boolean => {
  return pattern.test(str);
};

/**
 * 売主番号が正しい形式かチェック（AA + 5桁の数字）
 */
export const isValidSellerNumber = (sellerNumber: string): boolean => {
  return /^AA\d{5}$/.test(sellerNumber);
};

/**
 * 列挙型の値が有効かチェック
 */
export const isValidEnumValue = <T>(value: T, validValues: T[]): boolean => {
  return validValues.includes(value);
};

/**
 * オブジェクトの必須フィールドがすべて存在するかチェック
 */
export const hasRequiredFields = <T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): boolean => {
  return requiredFields.every(field => obj[field] !== undefined && obj[field] !== null);
};

/**
 * 2つの配列の和集合を取得
 */
export const union = <T>(arr1: T[], arr2: T[]): T[] => {
  return Array.from(new Set([...arr1, ...arr2]));
};

/**
 * 2つの配列の積集合を取得
 */
export const intersection = <T>(arr1: T[], arr2: T[]): T[] => {
  const set2 = new Set(arr2);
  return arr1.filter(item => set2.has(item));
};

/**
 * 配列の要素数の合計を計算
 */
export const sum = (arr: number[]): number => {
  return arr.reduce((acc, val) => acc + val, 0);
};

/**
 * テスト用のモックデータベース接続
 */
export class MockDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    this.data.set('sellers', []);
    this.data.set('activities', []);
    this.data.set('valuations', []);
  }

  async insert(table: string, record: any): Promise<any> {
    const records = this.data.get(table) || [];
    const newRecord = { ...record, id: this.generateId() };
    records.push(newRecord);
    this.data.set(table, records);
    return newRecord;
  }

  async findById(table: string, id: string): Promise<any | null> {
    const records = this.data.get(table) || [];
    return records.find(r => r.id === id) || null;
  }

  async findAll(table: string): Promise<any[]> {
    return this.data.get(table) || [];
  }

  async update(table: string, id: string, updates: any): Promise<any | null> {
    const records = this.data.get(table) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = { ...records[index], ...updates };
    this.data.set(table, records);
    return records[index];
  }

  async delete(table: string, id: string): Promise<boolean> {
    const records = this.data.get(table) || [];
    const filtered = records.filter(r => r.id !== id);
    this.data.set(table, filtered);
    return filtered.length < records.length;
  }

  clear(): void {
    this.data.clear();
    this.data.set('sellers', []);
    this.data.set('activities', []);
    this.data.set('valuations', []);
  }

  private generateId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 非同期関数のタイムアウトを設定
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

/**
 * 遅延を追加（テスト用）
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
