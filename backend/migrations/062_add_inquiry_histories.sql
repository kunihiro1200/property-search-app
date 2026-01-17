-- 問合せ履歴テーブルの作成

-- inquiry_histories テーブル
CREATE TABLE IF NOT EXISTS inquiry_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    inquiry_date DATE NOT NULL,
    inquiry_site VARCHAR(100),
    inquiry_reason TEXT,
    is_current_status BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_inquiry_histories_seller_id ON inquiry_histories(seller_id);
CREATE INDEX idx_inquiry_histories_inquiry_date ON inquiry_histories(inquiry_date DESC);
CREATE INDEX idx_inquiry_histories_is_current_status ON inquiry_histories(is_current_status);

-- Updated_at自動更新トリガー
CREATE TRIGGER update_inquiry_histories_updated_at BEFORE UPDATE ON inquiry_histories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE inquiry_histories IS '問合せ履歴（売主の複数回の問合せを記録）';
COMMENT ON COLUMN inquiry_histories.seller_id IS '売主ID';
COMMENT ON COLUMN inquiry_histories.inquiry_date IS '問合せ日';
COMMENT ON COLUMN inquiry_histories.inquiry_site IS '問合せサイト（ウ、L等）';
COMMENT ON COLUMN inquiry_histories.inquiry_reason IS '査定理由';
COMMENT ON COLUMN inquiry_histories.is_current_status IS '現在のステータスかどうか（最新の問合せ）';
COMMENT ON COLUMN inquiry_histories.notes IS '備考';
