-- Check ALL policies that might affect games queries
SELECT
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    tablename IN ('games', 'game_members', 'party_slots', 'story_overviews', 'campaign_seeds')
    OR qual LIKE '%games%'
    OR with_check LIKE '%games%'
  )
ORDER BY tablename, policyname;
