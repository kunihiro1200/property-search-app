-- Force PostgREST to reload its schema cache
-- This makes newly created tables visible to the REST API

NOTIFY pgrst, 'reload schema';
