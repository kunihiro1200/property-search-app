// 複数物件番号パーサー - カンマ区切りまたは区切り文字で区切られた複数の物件番号を解析
export class MultiplePropertyNumberParser {
  /**
   * 複数の物件番号を解析
   * カンマ、スペース、改行などで区切られた物件番号を個別に抽出
   */
  static parse(input: string | null | undefined): string[] {
    if (!input || typeof input !== 'string') {
      return [];
    }

    // 区切り文字: カンマ、スペース、改行、タブ、セミコロン
    const delimiters = /[,\s\n\r\t;]+/;
    
    const parts = input
      .split(delimiters)
      .map(part => part.trim())
      .filter(part => part.length > 0);

    // 物件番号フォーマット（AA + 数字）に一致するもののみを返す
    const propertyNumberPattern = /^AA\d+$/;
    
    return parts.filter(part => propertyNumberPattern.test(part));
  }

  /**
   * 単一の物件番号を検証
   */
  static isValid(propertyNumber: string): boolean {
    if (!propertyNumber || typeof propertyNumber !== 'string') {
      return false;
    }

    const pattern = /^AA\d+$/;
    return pattern.test(propertyNumber.trim());
  }

  /**
   * 複数の物件番号を検証
   */
  static validateAll(propertyNumbers: string[]): boolean {
    if (!Array.isArray(propertyNumbers) || propertyNumbers.length === 0) {
      return false;
    }

    return propertyNumbers.every(pn => this.isValid(pn));
  }
}
