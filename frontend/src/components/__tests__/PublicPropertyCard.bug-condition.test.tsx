/**
 * バグ条件探索テスト: storage_location あり・images 空の物件カード画像未表示バグ
 *
 * **Validates: Requirements 1.2**
 *
 * このテストは未修正コードで FAIL することが期待される。
 * FAIL がバグの存在を証明する。
 *
 * バグ条件 (isBugCondition):
 *   X.property.images.length = 0
 *   AND X.property.storage_location IS NOT NULL
 *   AND X.property.storage_location != ''
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicPropertyCard from '../PublicPropertyCard';
import { PublicProperty } from '../../types/publicProperty';

// PublicPropertyCard は useNavigate / useSearchParams を使用するため MemoryRouter でラップする
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

/**
 * バグ条件を満たす最小限の物件データを生成する
 * - images: [] (空配列)
 * - storage_location: "https://drive.google.com/drive/folders/ABC123"
 */
const makeBugConditionProperty = (): PublicProperty & { storage_location: string } => ({
  id: 'test-id-001',
  property_number: 'AA99999',
  property_type: 'land',
  address: '大分県別府市テスト1-2-3',
  display_address: '大分県別府市テスト',
  price: 10000000,
  land_area: 100,
  building_area: undefined,
  building_age: undefined,
  floor_plan: undefined,
  construction_year_month: undefined,
  description: 'テスト物件',
  features: [],
  images: [] as any, // バグ条件: images が空配列
  google_map_url: undefined,
  latitude: 33.28,
  longitude: 131.49,
  atbb_status: '専任・公開中',
  badge_type: 'none',
  is_clickable: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  storage_location: 'https://drive.google.com/drive/folders/ABC123', // バグ条件: storage_location が存在する
});

describe('PublicPropertyCard - バグ条件探索テスト (Property 1: Bug Condition)', () => {
  /**
   * Property 1: Bug Condition
   *
   * isBugCondition が true の場合（images.length = 0 かつ storage_location が存在する）、
   * 修正後の PublicPropertyCard は /api/public/folder-thumbnail/ABC123 を src に持つ
   * <img> タグを表示し、「画像なし」ボックスを表示しないこと。
   *
   * このテストは未修正コードで FAIL する（バグの存在を証明する）。
   */
  it('storage_location あり・images 空の物件で folder-thumbnail の <img> タグが表示されること', () => {
    const property = makeBugConditionProperty();

    renderWithRouter(
      <PublicPropertyCard property={property as any} />
    );

    // 期待される動作: /api/public/folder-thumbnail/ABC123 を src に持つ <img> タグが存在すること
    const img = screen.queryByRole('img', {
      name: /テスト物件画像|大分県別府市テスト/,
    }) as HTMLImageElement | null;

    // <img> タグが存在し、src が folder-thumbnail エンドポイントを指していること
    const allImgs = document.querySelectorAll('img');
    const folderThumbnailImg = Array.from(allImgs).find(
      (el) => el.getAttribute('src') === '/api/public/folder-thumbnail/ABC123'
    );

    // アサーション1: folder-thumbnail の <img> タグが存在すること
    expect(folderThumbnailImg).toBeDefined();

    // アサーション2: 「画像なし」ボックスが表示されないこと
    expect(screen.queryByText('画像なし')).not.toBeInTheDocument();
  });
});
