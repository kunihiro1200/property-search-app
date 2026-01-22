-- Migration 056: Add email_history table for tracking property emails sent to buyers
-- This table tracks detailed email history including multiple properties per email

-- Drop existing table if it exists (to ensure clean migration)
DROP TABLE IF EXISTS email_history CASCADE;

-- Create the email_history table
CREATE TABLE email_history (
    id SERIAL PRIMARY KEY,
    buyer_id TEXT NOT NULL REFERENCES buyers(buyer_id) ON DELETE CASCADE,
    property_numbers TEXT[] NOT NULL, -- Array of property numbers included in the email
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sender_email VARCHAR(255) NOT NULL, -- Email address of sender
    email_type VARCHAR(50) DEFAULT 'inquiry_response', -- 'distribution', 'inquiry_response', etc.
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure at least one property is included
    CONSTRAINT email_history_property_numbers_not_empty CHECK (array_length(property_numbers, 1) > 0)
);

-- Create indexes for common queries
CREATE INDEX idx_email_history_buyer_id ON email_history(buyer_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);
CREATE INDEX idx_email_history_sender_email ON email_history(sender_email);
CREATE INDEX idx_email_history_property_numbers ON email_history USING GIN(property_numbers);

-- Add comments for documentation
COMMENT ON TABLE email_history IS 'Stores history of emails sent to buyers with property information';
COMMENT ON COLUMN email_history.property_numbers IS 'Array of property numbers included in the email';
COMMENT ON COLUMN email_history.sender_email IS 'Email address of the employee who sent the email';
COMMENT ON COLUMN email_history.email_type IS 'Type of email: distribution, inquiry_response, etc.';
