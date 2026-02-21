/**
 * フィールドヘルパー関数
 * 
 * AppSheetのIFSロジックで使用されるフィールド関連の条件判定をサポートします。
 */

/**
 * フィールドが空（ISBLANK）かどうかを判定
 * NULL、空文字列、undefinedを空と判定します
 * 
 * @param value 判定する値
 * @returns 空の場合true
 */
export function isBlank(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * フィールドが空でない（ISNOTBLANK）かどうかを判定
 * 
 * @param value 判定する値
 * @returns 空でない場合true
 */
export function isNotBlank(value: any): boolean {
  return !isBlank(value);
}

/**
 * フィールドに指定された文字列が含まれる（CONTAINS）かどうかを判定
 * 部分一致で判定します
 * 
 * @param value 判定する値
 * @param searchString 検索する文字列
 * @returns 含まれる場合true
 */
export function contains(value: any, searchString: string): boolean {
  if (isBlank(value)) return false;
  if (isBlank(searchString)) return false;
  
  const valueStr = String(value);
  return valueStr.includes(searchString);
}

/**
 * フィールドに指定された文字列が含まれない（NOT CONTAINS）かどうかを判定
 * 
 * @param value 判定する値
 * @param searchString 検索する文字列
 * @returns 含まれない場合true
 */
export function notContains(value: any, searchString: string): boolean {
  return !contains(value, searchString);
}

/**
 * フィールドが指定された値と等しいかどうかを判定
 * 
 * @param value 判定する値
 * @param compareValue 比較する値
 * @returns 等しい場合true
 */
export function equals(value: any, compareValue: any): boolean {
  return value === compareValue;
}

/**
 * フィールドが指定された値と等しくないかどうかを判定
 * 
 * @param value 判定する値
 * @param compareValue 比較する値
 * @returns 等しくない場合true
 */
export function notEquals(value: any, compareValue: any): boolean {
  return value !== compareValue;
}

/**
 * AND条件を評価
 * 全ての条件が真の場合のみ真を返します
 * 
 * @param conditions 条件の配列
 * @returns 全ての条件が真の場合true
 */
export function and(...conditions: boolean[]): boolean {
  return conditions.every(condition => condition === true);
}

/**
 * OR条件を評価
 * いずれかの条件が真の場合に真を返します
 * 
 * @param conditions 条件の配列
 * @returns いずれかの条件が真の場合true
 */
export function or(...conditions: boolean[]): boolean {
  return conditions.some(condition => condition === true);
}

/**
 * NOT条件を評価
 * 条件の否定を返します
 * 
 * @param condition 条件
 * @returns 条件の否定
 */
export function not(condition: boolean): boolean {
  return !condition;
}
