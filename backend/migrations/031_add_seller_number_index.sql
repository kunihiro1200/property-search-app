-- 売主番号検索のパフォーマンス最適化
-- seller_numberカラムにインデックスを追加

-- pg_trgm拡張を有効化（部分一致検索の高速化に必要）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 通常のB-treeインデックス（完全一致検索用）
CREATE INDEX IF NOT EXISTS idx_sellers_seller_number ON sellers(seller_number);

-- 部分一致検索のためのGINインデックス
-- これにより ILIKE '%AA12903%' のような検索が高速化されます
CREATE INDEX IF NOT EXISTS idx_sellers_seller_number_gin ON sellers USING gin(seller_number gin_trgm_ops);
