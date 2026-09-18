-- Migration: Fix infinite recursion in user_roles RLS policies.
--
-- The "Admins can read all roles" and "Admins can manage roles" policies
-- query user_roles to check the current user's role, which triggers the
-- same RLS policies again → infinite recursion.
--
-- Fix: Use the SECURITY DEFINER function get_user_role() instead.
-- Because it's SECURITY DEFINER it bypasses RLS entirely, breaking the cycle.

-- ──────────────────────────────────────────────
-- 1. Drop the recursive policies on user_roles
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- ──────────────────────────────────────────────
-- 2. Recreate them using the RLS-safe function
-- ──────────────────────────────────────────────

-- Admins can read any user's role
CREATE POLICY "Admins can read all roles"
    ON public.user_roles
    FOR SELECT
    USING (
        public.get_user_role(auth.uid()) = 'admin'
    );

-- Admins can insert / update / delete roles
CREATE POLICY "Admins can manage roles"
    ON public.user_roles
    FOR ALL
    USING (
        public.get_user_role(auth.uid()) = 'admin'
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'admin'
    );

-- ──────────────────────────────────────────────
-- 3. Also fix the problems table policies that
--    reference user_roles with the same pattern
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert problems" ON public.problems;
DROP POLICY IF EXISTS "Admins can update problems" ON public.problems;

CREATE POLICY "Admins can insert problems"
    ON public.problems
    FOR INSERT
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'admin'
    );

CREATE POLICY "Admins can update problems"
    ON public.problems
    FOR UPDATE
    USING (
        public.get_user_role(auth.uid()) = 'admin'
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) = 'admin'
    );

-- Allow admins to delete problems too (needed for the new delete feature)
CREATE POLICY "Admins can delete problems"
    ON public.problems
    FOR DELETE
    USING (
        public.get_user_role(auth.uid()) = 'admin'
    );
