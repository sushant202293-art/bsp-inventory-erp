-- ============================================================
-- 011_block_public_signup.sql - Internal staff accounts only
--
-- BSP Inventory is internal company software: every account is
-- created by an administrator (Users -> Add User) or seeded with
-- supabase/seed/admin_user.sql. Self-service registration has been
-- removed from the UI, but the UI alone does not stop anyone holding
-- the public anon key from calling supabase.auth.signUp() directly,
-- so the guard lives in the database - the one place every new
-- auth.users row has to pass through.
--
-- The on_auth_user_created trigger (005, redefined by 007) now:
--
--   1. REJECTS any signup whose raw_user_meta_data does not carry
--      invited_by_admin = true. The RAISE happens inside an AFTER
--      INSERT trigger, so the whole insert rolls back and GoTrue
--      reports the signup as failed - no auth user, no profile.
--
--   2. For an invited user, provisions the complete profile -
--      company_id, role, department, contact - from the invitation
--      metadata. Previously the trigger always inserted a bare
--      'viewer' profile first and the application's own insert then
--      collided with it (ON CONFLICT), so the role and company an
--      admin picked were silently dropped.
--
-- Client side of this change:
--   * src/modules/users/UserListPage.tsx sends invited_by_admin plus
--     the profile fields in options.data and no longer inserts into
--     profiles itself.
--   * src/pages/SignupPage.tsx (self-service signup) was deleted and
--     the /signup route removed.
--
-- Existing auth.users rows are untouched: the trigger only fires on
-- INSERT. Additive only; safe to re-run (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_invited    BOOLEAN := false;
    v_company_id UUID;
    v_full_name  TEXT;
    v_role       TEXT;
    v_contact    TEXT;
    v_department TEXT;
BEGIN
    -- raw_user_meta_data is the only metadata bucket a browser can set
    -- through supabase.auth.signUp({ options: { data: {...} } }).
    v_invited := lower(coalesce(NEW.raw_user_meta_data ->> 'invited_by_admin', ''))
                 IN ('true', '1', 'yes');

    IF NOT v_invited THEN
        RAISE EXCEPTION
            'Public sign-up is disabled. Ask an administrator to create your account.';
    END IF;

    v_full_name  := NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), '');
    v_role       := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'role'), ''), 'viewer');
    v_contact    := NULLIF(trim(NEW.raw_user_meta_data ->> 'contact'), '');
    v_department := NULLIF(trim(NEW.raw_user_meta_data ->> 'department'), '');

    -- Optional: attach the invited user to an existing company.
    BEGIN
        v_company_id := NULLIF(trim(NEW.raw_user_meta_data ->> 'company_id'), '')::UUID;
    EXCEPTION WHEN others THEN
        v_company_id := NULL;
    END;

    IF v_company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id = v_company_id) THEN
        v_company_id := NULL;
    END IF;

    INSERT INTO public.profiles (
        id, company_id, email, full_name, contact, department, role, is_active
    )
    VALUES (
        NEW.id,
        v_company_id,
        NEW.email,
        v_full_name,
        v_contact,
        v_department,
        v_role,
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-point the existing trigger at the updated function body.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
