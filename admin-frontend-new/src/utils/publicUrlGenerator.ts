/**
 * 公開物件サイトのURL生成ユーティリティ
 */

/**
 * 公開物件サイトのURLを生成
 * @param propertyNumber 物件番号（例: AA9313）
 * @returns 公開URL
 */
export const generatePublicPropertyUrl = (
  propertyNumber: string
): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/public/properties/${propertyNumber}`;
};

/**
 * ベースURLを取得
 * @returns ベースURL
 */
const getBaseUrl = (): string => {
  // 環境変数から取得（本番環境用）
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  
  // 開発環境ではwindow.location.originを使用
  return window.location.origin;
};

/**
 * URLを短縮表示用にトリミング
 * @param url 完全URL
 * @param maxLength 最大文字数
 * @returns 短縮URL
 */
export const truncateUrl = (url: string, maxLength: number = 30): string => {
  if (url.length <= maxLength) {
    return url;
  }
  
  // 末尾を表示（物件番号が見えるように）
  const suffix = url.slice(-maxLength + 3);
  return `...${suffix}`;
};
