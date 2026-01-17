-- Migration: Add template fields to email_history table
-- Description: Adds template_id and template_name columns to track which email template was used

-- Add template_id column
ALTER TABLE email_history
ADD COLUMN IF NOT EXISTS template_id VARCHAR(100);

-- Add template_name column
ALTER TABLE email_history
ADD COLUMN IF NOT EXISTS template_name VARCHAR(200);

-- Add index for template_id for faster queries
CREATE INDEX IF NOT EXISTS idx_email_history_template_id ON email_history(template_id);

-- Add comment to document the columns
COMMENT ON COLUMN email_history.template_id IS 'ID of the email template used for this email';
COMMENT ON COLUMN email_history.template_name IS 'Name of the email template used for this email';
