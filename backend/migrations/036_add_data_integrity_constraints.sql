-- Migration 036: データ整合性制約の追加
-- 売主と物件の1:1関係を保証し、孤立データを防止

-- 1. 物件テーブルの外部キー制約を確認・追加
-- 売主が削除された場合、関連する物件も削除される（CASCADE）
DO $$
BEGIN
    -- 既存の外部キー制約を削除（存在する場合）
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'properties_seller_id_fkey' 
        AND table_name = 'properties'
    ) THEN
        ALTER TABLE properties DROP CONSTRAINT properties_seller_id_fkey;
    END IF;
    
    -- 新しい外部キー制約を追加（ON DELETE CASCADE）
    ALTER TABLE properties 
    ADD CONSTRAINT properties_seller_id_fkey 
    FOREIGN KEY (seller_id) 
    REFERENCES sellers(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '外部キー制約を追加しました（ON DELETE CASCADE）';
END $$;

-- 2. 売主作成時に自動的に物件レコードを作成するトリガー関数
CREATE OR REPLACE FUNCTION create_property_for_new_seller()
RETURNS TRIGGER AS $$
BEGIN
    -- 新しい売主に対して空の物件レコードを作成
    INSERT INTO properties (seller_id, address)
    VALUES (NEW.id, '未入力')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. トリガーを作成（既存の場合は置き換え）
DROP TRIGGER IF EXISTS trigger_create_property_for_seller ON sellers;

CREATE TRIGGER trigger_create_property_for_seller
AFTER INSERT ON sellers
FOR EACH ROW
EXECUTE FUNCTION create_property_for_new_seller();

-- 4. 査定テーブルの外部キー制約も確認・追加
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valuations_seller_id_fkey' 
        AND table_name = 'valuations'
    ) THEN
        ALTER TABLE valuations DROP CONSTRAINT valuations_seller_id_fkey;
    END IF;
    
    ALTER TABLE valuations 
    ADD CONSTRAINT valuations_seller_id_fkey 
    FOREIGN KEY (seller_id) 
    REFERENCES sellers(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '査定テーブルの外部キー制約を追加しました';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '査定テーブルが存在しません';
END $$;

-- 5. コメント追加
COMMENT ON CONSTRAINT properties_seller_id_fkey ON properties IS 
'売主削除時に関連物件も自動削除';

COMMENT ON FUNCTION create_property_for_new_seller() IS 
'新規売主作成時に自動的に物件レコードを作成';

COMMENT ON TRIGGER trigger_create_property_for_seller ON sellers IS 
'売主作成後に物件レコードを自動作成';
