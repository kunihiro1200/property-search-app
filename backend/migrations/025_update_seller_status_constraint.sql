-- Migration 025: Update Seller Status Constraint
-- Add missing status values to sellers_status_check constraint

-- Drop existing constraint
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

-- Add new constraint with all status values
ALTER TABLE sellers ADD CONSTRAINT sellers_status_check 
CHECK (status IN (
    'new', 
    'following_up', 
    'appointment_scheduled', 
    'visited', 
    'exclusive_contract',
    'general_contract',
    'contracted', 
    'other_decision',
    'follow_up_not_needed',
    'follow_up_not_needed_after_exclusion',
    'other_company_purchase',
    'other_decision_follow_up',
    'other_decision_exclusive',
    'other_decision_general',
    'lost'
));

-- Add comment
COMMENT ON CONSTRAINT sellers_status_check ON sellers IS '売主ステータスの制約（全ステータス値を含む）';
