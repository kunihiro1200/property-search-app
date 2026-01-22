-- Migration 056: Add email_history table with RPC functions
-- This migration creates the email_history table and RPC functions to bypass PostgREST cache issues

-- Create email_history table
CREATE TABLE IF NOT EXISTS public.email_history (
  id SERIAL PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  property_numbers TEXT[] NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  email_type TEXT DEFAULT 'inquiry_response',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_history_buyer_id ON public.email_history(buyer_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON public.email_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_history_property_numbers ON public.email_history USING GIN(property_numbers);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON public.email_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.email_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create RPC function to insert email history (bypasses PostgREST cache)
CREATE OR REPLACE FUNCTION public.insert_email_history(
  p_buyer_id TEXT,
  p_property_numbers TEXT[],
  p_recipient_email TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_sender_email TEXT,
  p_email_type TEXT DEFAULT 'inquiry_response'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO public.email_history (
    buyer_id,
    property_numbers,
    recipient_email,
    subject,
    body,
    sender_email,
    email_type,
    sent_at
  ) VALUES (
    p_buyer_id,
    p_property_numbers,
    p_recipient_email,
    p_subject,
    p_body,
    p_sender_email,
    p_email_type,
    NOW()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Create RPC function to get email history for a buyer
CREATE OR REPLACE FUNCTION public.get_buyer_email_history(
  p_buyer_id TEXT
)
RETURNS TABLE (
  id INTEGER,
  buyer_id TEXT,
  property_numbers TEXT[],
  recipient_email TEXT,
  subject TEXT,
  body TEXT,
  sender_email TEXT,
  email_type TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eh.id,
    eh.buyer_id,
    eh.property_numbers,
    eh.recipient_email,
    eh.subject,
    eh.body,
    eh.sender_email,
    eh.email_type,
    eh.sent_at,
    eh.created_at
  FROM public.email_history eh
  WHERE eh.buyer_id = p_buyer_id
  ORDER BY eh.sent_at DESC;
END;
$$;

-- Create RPC function to check if property has been emailed
CREATE OR REPLACE FUNCTION public.check_property_emailed(
  p_buyer_id TEXT,
  p_property_number TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.email_history
    WHERE buyer_id = p_buyer_id
    AND p_property_number = ANY(property_numbers)
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.insert_email_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_buyer_email_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_property_emailed TO authenticated;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
