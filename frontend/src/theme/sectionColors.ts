/**
 * セクション別のテーマカラー定義
 * 各セクション（売主・買主・物件・業務依頼）で統一されたカラーを使用
 */

export const SECTION_COLORS = {
  seller: {
    main: '#ff9800', // オレンジ
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#fff',
  },
  buyer: {
    main: '#4caf50', // 緑
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#fff',
  },
  property: {
    main: '#2196f3', // 青
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#fff',
  },
  workTask: {
    main: '#9c27b0', // 紫
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#fff',
  },
} as const;

export type SectionType = keyof typeof SECTION_COLORS;

/**
 * パスからセクションタイプを判定
 */
export function getSectionTypeFromPath(pathname: string): SectionType | null {
  if (pathname === '/' || pathname.startsWith('/sellers') || pathname.startsWith('/call-mode')) {
    return 'seller';
  }
  if (pathname.startsWith('/buyers')) {
    return 'buyer';
  }
  if (pathname.startsWith('/property')) {
    return 'property';
  }
  if (pathname.startsWith('/work-task')) {
    return 'workTask';
  }
  return null;
}

/**
 * セクションカラーを取得
 */
export function getSectionColor(sectionType: SectionType | null): typeof SECTION_COLORS.seller {
  if (!sectionType) {
    return SECTION_COLORS.seller; // デフォルト
  }
  return SECTION_COLORS[sectionType];
}
