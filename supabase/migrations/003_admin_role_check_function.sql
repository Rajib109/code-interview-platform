-- Migration: Create a SECURITY DEFINER function to check admin role.
-- This bypasses RLS so the app can always read the user's role,
-- even if the session JWT isn't fully recognized by PostgREST.

CREATE OR REPLACE FUNCTION public.get_user_role(lookup_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = lookup_user_id LIMIT 1;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;
