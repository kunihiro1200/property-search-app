-- Migration: Enable pg_trgm Extension for Partial Text Matching
-- Description: Enables the PostgreSQL pg_trgm extension to support trigram-based
--              similarity searches and GIN indexes for efficient partial text matching
--              on address and property_number fields.
-- Date: 2026-01-03

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
-- Run: SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
