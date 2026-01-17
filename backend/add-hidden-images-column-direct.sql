-- 直接PostgreSQLでhidden_imagesカラムを追加
-- マイグレーション077が何らかの理由で実行されていない可能性があるため、直接追加

-- カラムが存在しない場合のみ追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_listings' 
        AND column_name = 'hidden_images'
    ) THEN
        ALTER TABLE public.property_listings 
        ADD COLUMN hidden_images TEXT[] DEFAULT '{}';
        
        RAISE NOTICE 'hidden_images column added successfully';
    ELSE
        RAISE NOTICE 'hidden_images column already exists';
    END IF;
END $$;

-- カラムの確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'property_listings'
AND column_name = 'hidden_images';
