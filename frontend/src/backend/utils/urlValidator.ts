// URL検証ユーティリティ
export class UrlValidator {
  private static readonly GOOGLE_MAP_URL_PATTERNS = [
    /^https:\/\/maps\.google\.com\/.+/,
    /^https:\/\/www\.google\.com\/maps\/.+/,
    /^https:\/\/goo\.gl\/maps\/.+/,
  ];

  private static readonly GOOGLE_DRIVE_FOLDER_PATTERNS = [
    /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/,
  ];

  /**
   * Google Map URLを検証
   * @param url 検証するURL
   * @returns 有効な場合true
   */
  static validateGoogleMapUrl(url: string): boolean {
    if (!url || url.trim() === '') return true; // Empty is valid (optional)
    return this.GOOGLE_MAP_URL_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Google DriveフォルダURLを検証
   * @param url 検証するURL
   * @returns 有効な場合true
   */
  static validateGoogleDriveFolderUrl(url: string): boolean {
    if (!url || url.trim() === '') return true; // Empty is valid (optional)
    return this.GOOGLE_DRIVE_FOLDER_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * URLをサニタイズ（トリム）
   * @param url サニタイズするURL
   * @returns サニタイズされたURL
   */
  static sanitizeUrl(url: string): string {
    return url.trim();
  }
}
