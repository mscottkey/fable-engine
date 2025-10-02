-- Clean up duplicate foreign key constraints
-- The issue is we have both auto-generated and manually added constraints

-- First, let's see what constraints exist
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage 
WHERE table_schema = 'public' 
    AND table_name = 'games'
    AND column_name = 'seed_id';
