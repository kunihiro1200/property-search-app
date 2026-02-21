import { Employee } from '../types';

/**
 * UUID形式を検出する正規表現
 * 例: 112cec78-171c-4012-a064-d508e72ba9d3
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Initialsコードから名前へのマッピング（後方互換性のため保持）
 */
const INITIALS_TO_NAME_MAP: Record<string, string> = {
  'U': '裏',
  'M': '河野',
  'Y': '山本',
  'W': '和田',
  'K': '国広',
  '生': '生野',
};

/**
 * 文字列がUUID形式かどうかを判定
 * @param str - 判定する文字列
 * @returns UUID形式の場合true
 */
export function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * 従業員識別子（UUIDまたはinitials）から従業員名を取得
 * 
 * 処理フロー:
 * 1. identifierが空の場合 → デフォルト値「担当者」を返す
 * 2. identifierがUUID形式の場合:
 *    - employeesリストから検索
 *    - 見つかった場合 → employee.nameを返す
 *    - 見つからない場合 → デフォルト値「担当者」を返す
 * 3. identifierがinitialsコードの場合:
 *    - 静的マッピングで変換
 *    - マッピングに存在する場合 → 名前を返す
 *    - マッピングに存在しない場合 → identifierをそのまま返す
 * 
 * @param identifier - 従業員のUUIDまたはinitialsコード
 * @param employees - 従業員リスト（オプション）
 * @returns 従業員名、見つからない場合は「担当者」
 */
export function getEmployeeName(
  identifier: string | undefined,
  employees?: Employee[]
): string {
  // 1. identifierが空の場合
  if (!identifier || identifier.trim().length === 0) {
    return '担当者';
  }

  const trimmedIdentifier = identifier.trim();

  // 2. UUID形式の場合
  if (isUUID(trimmedIdentifier)) {
    if (employees && employees.length > 0) {
      const employee = employees.find(emp => emp.id === trimmedIdentifier);
      if (employee) {
        return employee.name;
      }
    }
    // UUIDだが従業員が見つからない場合
    console.warn(`Employee not found for UUID: ${trimmedIdentifier}`);
    return '担当者';
  }

  // 3. initialsコードの場合
  if (trimmedIdentifier in INITIALS_TO_NAME_MAP) {
    return INITIALS_TO_NAME_MAP[trimmedIdentifier];
  }

  // マッピングに存在しない場合はそのまま返す
  return trimmedIdentifier;
}

/**
 * 従業員オブジェクトから表示名を取得
 * 暗号化されたような文字列や無効な名前を検出し、適切なフォールバックを提供
 * 
 * @param employee - 従業員オブジェクト（nullまたはundefinedも許容）
 * @returns 表示用の名前
 */
export function getDisplayName(employee: { name?: string; email?: string } | null | undefined): string {
  // 従業員オブジェクトがない場合
  if (!employee) {
    return '担当者';
  }

  // 名前が存在しない場合
  if (!employee.name || employee.name.trim().length === 0) {
    // メールアドレスから抽出を試みる
    if (employee.email) {
      return extractNameFromEmail(employee.email);
    }
    return '担当者';
  }

  const name = employee.name.trim();

  // 無効な名前パターンをチェック
  if (isInvalidName(name)) {
    console.warn(`Invalid employee name detected: "${name}" for ${employee.email}`);
    // メールアドレスから抽出
    if (employee.email) {
      return extractNameFromEmail(employee.email);
    }
    return '担当者';
  }

  return name;
}

/**
 * 名前が無効かどうかをチェック
 * @param name - チェックする名前
 * @returns 無効な場合true
 */
function isInvalidName(name: string): boolean {
  // "不明"をチェック
  if (name === '不明' || name === 'Unknown') {
    return true;
  }

  // 暗号化されたような文字列をチェック（Base64パターン）
  const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;
  if (base64Pattern.test(name)) {
    return true;
  }

  // メールアドレスそのものが名前になっている場合
  if (name.includes('@')) {
    return true;
  }

  return false;
}

/**
 * メールアドレスから名前を抽出してフォーマット
 * @param email - メールアドレス
 * @returns フォーマットされた名前
 */
function extractNameFromEmail(email: string): string {
  if (!email || email.trim().length === 0) {
    return '担当者';
  }

  // @の前の部分を取得
  const atIndex = email.indexOf('@');
  const prefix = atIndex > 0 ? email.substring(0, atIndex) : email;

  // ドットとアンダースコアをスペースに置換
  let formatted = prefix.replace(/[._]/g, ' ');

  // 各単語の最初の文字を大文字に
  formatted = formatted
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();

  // フォーマット結果が空の場合は元のプレフィックスを返す
  if (formatted.length === 0) {
    return prefix;
  }

  return formatted;
}
