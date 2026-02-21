import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { detectSearchType, SearchQueryType } from '../utils/searchQueryDetector';

/**
 * 統一検索フックの戻り値の型定義
 */
export interface UseUnifiedSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  searchType: SearchQueryType | null;
}

/**
 * 統一検索フック
 * 
 * 検索クエリの状態管理、URLパラメータとの同期、デバウンス処理を提供
 * 物件番号（AA, BB, CCで始まる）と所在地検索を自動判定
 * 
 * @returns UseUnifiedSearchReturn - 検索状態と操作関数
 */
export function useUnifiedSearch(): UseUnifiedSearchReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchQueryType | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // 初期化: URLパラメータから検索クエリを復元
  useEffect(() => {
    const propertyNumber = searchParams.get('propertyNumber');
    const location = searchParams.get('location');

    if (propertyNumber) {
      setSearchQuery(propertyNumber);
      setSearchType('property_number');
    } else if (location) {
      setSearchQuery(location);
      setSearchType('location');
    }
  }, []); // 初回マウント時のみ実行

  // 検索クエリが変更されたときの処理（デバウンス付き）
  useEffect(() => {
    // デバウンスタイマーをクリア
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // 検索クエリが空の場合は検索パラメータのみクリア（フィルターは保持）
    if (!searchQuery.trim()) {
      setSearchType(null);
      updateURLParams('', null);
      return;
    }

    // 500msのデバウンス処理
    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 500);

    setDebounceTimer(timer);

    // クリーンアップ
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchQuery]);

  /**
   * 検索を実行
   * @param query - 検索クエリ
   */
  const executeSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchType(null);
      updateURLParams('', null);
      return;
    }

    // 検索タイプを検出
    const detected = detectSearchType(trimmedQuery);
    setSearchType(detected.type);

    // URLパラメータを更新
    updateURLParams(detected.value, detected.type);
  }, []);

  /**
   * URLパラメータを更新
   * @param value - 検索値
   * @param type - 検索タイプ
   */
  const updateURLParams = useCallback((value: string, type: SearchQueryType | null) => {
    const newParams = new URLSearchParams(searchParams);

    // 既存の検索パラメータをクリア（検索関連のみ）
    newParams.delete('propertyNumber');
    newParams.delete('location');
    
    // 検索実行時はフィルターパラメータもクリア
    // （検索とフィルターは独立して動作すべき）
    newParams.delete('types');
    newParams.delete('minPrice');
    newParams.delete('maxPrice');
    newParams.delete('minAge');
    newParams.delete('maxAge');
    newParams.delete('showPublicOnly');

    // 新しい検索パラメータを設定
    if (value && type) {
      if (type === 'property_number') {
        newParams.set('propertyNumber', value);
      } else if (type === 'location') {
        newParams.set('location', value);
      }
    }

    // ページ番号をリセット（検索時は1ページ目に戻る）
    newParams.delete('page');

    // canHideパラメータを明示的に保持（重要：管理者モードを維持）
    const currentCanHide = searchParams.get('canHide');
    if (currentCanHide === 'true') {
      newParams.set('canHide', 'true');
    }

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  /**
   * 検索を即座に実行（Enterキー押下時など）
   */
  const handleSearch = useCallback(() => {
    // デバウンスタイマーをクリア
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }

    // 即座に検索を実行
    executeSearch(searchQuery);
  }, [searchQuery, debounceTimer, executeSearch]);

  return {
    searchQuery,
    setSearchQuery,
    handleSearch,
    searchType,
  };
}
