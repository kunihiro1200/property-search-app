/**
 * 保全プロパティテスト: storage_location なし物件の「画像なし」表示保全
 *
 * **Validates: Requirements 3.3**
 *
 * このテストは未修正コードで PASS することが期待される。
 * PASS がベースライン動作（非バグ条件の入力での正常動作）を確認する。
 *
 * 保全すべき動作:
 *   1. storage_location が null の物件 → 「画像なし」ボックスが表示される（クラッシュしない）
 *   2. storage_location が空文字列の物件 → 「画像なし」ボックスが表示される（クラッシュしない）
 *   3. images 配列に画像データがある物件 → 既存の <img> タグが表示される
 *
 * 非バグ条件 (NOT isBugCondition):
 *   - storage_location が null
 *   - storage_location が空文字列 ""
 *   - images 配列に画像データがある（thumbnailUrl が存在する）
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicPropertyCard from '../PublicPropertyCard';
import { PublicProperty } from '../../types/publicProperty';

// PublicPropertyCard は useNavigate / useSearchParams を使用するため MemoryRouter でラップする
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

/**
 * ベース物件データ（共通フィールド）
 */
const baseProperty = {
  id: 'test-id-preservation',
  property_number: 'AA88888',
  property_type: 'land',
  address: '大分県別府市保全テスト1-2-3',
  display_address: '大分県別府市保全テスト',
  price: 8000000,
  land_area: 80,
  building_area: undefined,
  building_age: undefined,
  floor_plan: undefined,
  construction_year_month: undefined,
  description: '保全テスト物件',
  features: [],
  google_map_url: undefined,
  latitude: 33.28,
  longitude: 131.49,
  atbb_status: '専任・公開中',
  badge_type: 'none' as const,
  is_clickable: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

/**
 * storage_location が null の物件データを生成する（非バグ条件）
 */
const makeNullStorageLocationProperty = (): PublicProperty => ({
  ...baseProperty,
  images: [] as any, // images は空配列
  // storage_location は undefined（型に存在しないため as any でキャスト）
} as any);

/**
 * storage_location が空文字列の物件データを生成する（非バグ条件）
 */
const makeEmptyStorageLocationProperty = (): PublicProperty => ({
  ...baseProperty,
  images: [] as any, // images は空配列
  storage_location: '', // 空文字列
} as any);

/**
 * images 配列に画像データがある物件データを生成する（非バグ条件）
 */
const makePropertyWithImages = (thumbnailUrl: string): PublicProperty => ({
  ...baseProperty,
  images: [
    {
      thumbnailUrl,
    },
  ] as any, // images に画像データあり
} as any);

describe('PublicPropertyCard - 保全プロパティテスト (Property 2: Preservation)', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * 観察1: storage_location が null の物件で「画像なし」ボックスが表示される
   *
   * 未修正コードで PASS することが期待される（ベースライン動作の確認）
   */
  it('storage_location が null の物件で「画像なし」ボックスが表示されること', () => {
    const property = makeNullStorageLocationProperty();

    renderWithRouter(
      <PublicPropertyCard property={property as any} />
    );

    // アサーション: 「画像なし」ボックスが表示されること
    expect(screen.getByText('画像なし')).toBeInTheDocument();

    // アサーション: folder-thumbnail の <img> タグが存在しないこと
    const allImgs = document.querySelectorAll('img');
    const folderThumbnailImg = Array.from(allImgs).find(
      (el) => el.getAttribute('src')?.includes('/api/public/folder-thumbnail/')
    );
    expect(folderThumbnailImg).toBeUndefined();
  });

  /**
   * 観察2: storage_location が空文字列の物件で「画像なし」ボックスが表示される
   *
   * 未修正コードで PASS することが期待される（ベースライン動作の確認）
   */
  it('storage_location が空文字列の物件で「画像なし」ボックスが表示されること', () => {
    const property = makeEmptyStorageLocationProperty();

    renderWithRouter(
      <PublicPropertyCard property={property as any} />
    );

    // アサーション: 「画像なし」ボックスが表示されること
    expect(screen.getByText('画像なし')).toBeInTheDocument();

    // アサーション: folder-thumbnail の <img> タグが存在しないこと
    const allImgs = document.querySelectorAll('img');
    const folderThumbnailImg = Array.from(allImgs).find(
      (el) => el.getAttribute('src')?.includes('/api/public/folder-thumbnail/')
    );
    expect(folderThumbnailImg).toBeUndefined();
  });

  /**
   * 観察3: images 配列に画像データがある物件で既存の <img> タグが表示される
   *
   * 未修正コードで PASS することが期待される（ベースライン動作の確認）
   */
  it('images 配列に画像データがある物件で既存の <img> タグが表示されること', () => {
    const thumbnailUrl = '/api/public/images/XYZ/thumbnail';
    const property = makePropertyWithImages(thumbnailUrl);

    renderWithRouter(
      <PublicPropertyCard property={property as any} />
    );

    // アサーション: thumbnailUrl を src に持つ <img> タグが存在すること
    const allImgs = document.querySelectorAll('img');
    const thumbnailImg = Array.from(allImgs).find(
      (el) => el.getAttribute('src') === thumbnailUrl
    );
    expect(thumbnailImg).toBeDefined();

    // アサーション: 「画像なし」ボックスが表示されないこと
    expect(screen.queryByText('画像なし')).not.toBeInTheDocument();
  });

  /**
   * プロパティベーステスト: storage_location が null または空文字列の全ての物件で
   * 「画像なし」ボックスが表示されること
   *
   * 複数の非バグ条件入力パターンを網羅する
   */
  it('storage_location が null または空文字列の様々なパターンで「画像なし」ボックスが表示されること', () => {
    // 非バグ条件の入力パターン一覧
    const nonBugConditionPatterns: Array<{ label: string; property: PublicProperty }> = [
      {
        label: 'storage_location が undefined',
        property: { ...baseProperty, images: [] as any } as any,
      },
      {
        label: 'storage_location が null',
        property: { ...baseProperty, images: [] as any, storage_location: null } as any,
      },
      {
        label: 'storage_location が空文字列',
        property: { ...baseProperty, images: [] as any, storage_location: '' } as any,
      },
      {
        label: 'storage_location が空白のみ',
        property: { ...baseProperty, images: [] as any, storage_location: '   ' } as any,
      },
    ];

    for (const { label, property } of nonBugConditionPatterns) {
      cleanup();
      renderWithRouter(
        <PublicPropertyCard property={property as any} />
      );

      // アサーション: 「画像なし」ボックスが表示されること（クラッシュしない）
      expect(screen.getByText('画像なし')).toBeInTheDocument();
    }
  });

  /**
   * プロパティベーステスト: images 配列に画像データがある場合は既存の <img> タグが表示されること
   *
   * 複数の thumbnailUrl パターンを網羅する
   */
  it('images 配列に画像データがある様々なパターンで既存の <img> タグが表示されること', () => {
    const thumbnailUrls = [
      '/api/public/images/XYZ/thumbnail',
      '/api/public/images/ABC123/thumbnail',
      '/api/public/images/test-folder-id/thumbnail',
    ];

    for (const thumbnailUrl of thumbnailUrls) {
      cleanup();
      const property = makePropertyWithImages(thumbnailUrl);

      renderWithRouter(
        <PublicPropertyCard property={property as any} />
      );

      // アサーション: thumbnailUrl を src に持つ <img> タグが存在すること
      const allImgs = document.querySelectorAll('img');
      const thumbnailImg = Array.from(allImgs).find(
        (el) => el.getAttribute('src') === thumbnailUrl
      );
      expect(thumbnailImg).toBeDefined();

      // アサーション: 「画像なし」ボックスが表示されないこと
      expect(screen.queryByText('画像なし')).not.toBeInTheDocument();
    }
  });
});
