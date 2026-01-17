-- Rollback Migration 037: Multi-Entity Management Expansion

-- Drop indexes first
DROP INDEX IF EXISTS idx_task_assignee_history_task_id;
DROP INDEX IF EXISTS idx_work_tasks_completed;
DROP INDEX IF EXISTS idx_work_tasks_due_date;
DROP INDEX IF EXISTS idx_work_tasks_assignee;
DROP INDEX IF EXISTS idx_work_tasks_work_id;
DROP INDEX IF EXISTS idx_works_status;
DROP INDEX IF EXISTS idx_works_property_number;
DROP INDEX IF EXISTS idx_viewings_assignee;
DROP INDEX IF EXISTS idx_viewings_status;
DROP INDEX IF EXISTS idx_viewings_viewing_date;
DROP INDEX IF EXISTS idx_viewings_buyer_id;
DROP INDEX IF EXISTS idx_viewings_property_number;
DROP INDEX IF EXISTS idx_buyer_inquiries_inquiry_date;
DROP INDEX IF EXISTS idx_buyer_inquiries_property_number;
DROP INDEX IF EXISTS idx_buyer_inquiries_buyer_id;
DROP INDEX IF EXISTS idx_buyers_assigned_to;
DROP INDEX IF EXISTS idx_buyers_confidence;
DROP INDEX IF EXISTS idx_site_registrations_status;
DROP INDEX IF EXISTS idx_site_registrations_property_number;
DROP INDEX IF EXISTS idx_listed_properties_status;
DROP INDEX IF EXISTS idx_listed_properties_seller_number;

-- Drop tables in reverse order (due to foreign key constraints)
DROP TABLE IF EXISTS task_assignee_history;
DROP TABLE IF EXISTS work_tasks;
DROP TABLE IF EXISTS works;
DROP TABLE IF EXISTS viewings;
DROP TABLE IF EXISTS buyer_inquiries;
DROP TABLE IF EXISTS buyers;
DROP TABLE IF EXISTS site_registrations;
DROP TABLE IF EXISTS listed_properties;
