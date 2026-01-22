/**
 * プレースホルダー画像のBase64エンコード版
 * 
 * ネットワークエラー時でも確実に表示できるように、
 * SVG画像をBase64エンコードして保存しています。
 * 
 * SVGソース:
 * <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
 *   <rect width="400" height="300" fill="#f3f4f6"/>
 *   <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#9ca3af" text-anchor="middle" dy=".3em">画像がありません</text>
 * </svg>
 */
export const PLACEHOLDER_IMAGE_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlLvlg4/jgYzjgYLjgorjgb7jgZvjgpM8L3RleHQ+Cjwvc3ZnPg==';

/**
 * ロゴのフォールバック用SVG（テキストのみ）
 * 
 * SVGソース:
 * <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
 *   <text x="50%" y="50%" font-family="Arial" font-size="20" font-weight="600" fill="#000000" text-anchor="middle" dy=".3em">株式会社いふう</text>
 * </svg>
 */
export const LOGO_FALLBACK_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSI2MDAiIGZpbGw9IiMwMDAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7moKrlvI/kvJrnpL7jgYTjgbXjgYY8L3RleHQ+Cjwvc3ZnPg==';
