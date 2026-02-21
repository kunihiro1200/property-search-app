/**
 * メールアドレスから表示名を生成
 * 例: tomoko.kunihiro@ifoo-oita.com → K
 * 例: john@example.com → J
 * 
 * @param email メールアドレス
 * @returns 表示名（姓の最初の文字を大文字にしたもの、無効な場合は "?"）
 */
export function getDisplayNameFromEmail(email: string): string {
  // 空文字列またはnull/undefinedの場合
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return '?';
  }

  try {
    // @より前の部分を取得
    const localPart = email.split('@')[0];
    
    if (!localPart) {
      return '?';
    }

    // ドット（.）で分割
    const parts = localPart.split('.');
    
    if (parts.length === 0) {
      return '?';
    }

    // 最後の部分（姓）の最初の文字を大文字にして返す
    // ドットがない場合は、名前全体の最初の文字を返す
    const lastName = parts[parts.length - 1];
    
    if (!lastName || lastName.length === 0) {
      return '?';
    }

    return lastName.charAt(0).toUpperCase();
  } catch (error) {
    // エラーが発生した場合はデフォルト値を返す
    return '?';
  }
}
