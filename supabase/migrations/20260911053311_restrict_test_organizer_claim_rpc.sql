-- Supabase projects can have explicit role grants in addition to PostgreSQL's
-- PUBLIC defaults. State both sides so this test-only RPC is never anonymous.
revoke all on function public.claim_test_organizer_membership() from public, anon, authenticated;
grant execute on function public.claim_test_organizer_membership() to authenticated;
