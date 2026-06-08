-- Allow anon role full access to all runtime tables (prototype/dev mode)
-- For production, replace with proper auth-based policies.

-- Option: Add permissive policies for anon role on all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'organizations', 'contacts', 'leads', 'model_routes',
      'agents', 'agent_versions', 'agent_skills', 'agent_scripts',
      'agent_mcp_servers', 'agent_cli_tools',
      'workflows', 'workflow_versions', 'workflow_steps',
      'sessions', 'session_messages', 'context_snapshots',
      'protected_facts', 'handoffs', 'lead_qualification',
      'approval_requests', 'approval_decisions',
      'tool_calls', 'model_calls', 'eval_cases', 'eval_runs'
    )
  LOOP
    -- Ensure RLS is enabled (idempotent)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- Drop existing policy if any (avoid conflict)
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon full access" ON public.%I', t);
    -- Create permissive policy for anon
    EXECUTE format('CREATE POLICY "Allow anon full access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$$;
