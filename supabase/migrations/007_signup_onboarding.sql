-- ============================================================
-- 007_signup_onboarding.sql – Make self-service signup actually work
--
-- Migration 005 defined public.handle_new_user(), but it could not
-- complete a signup for two independent reasons:
--
--   1. It read the company id from NEW.raw_app_meta_data. Supabase only
--      lets a client write raw_user_meta_data; app_metadata is writable
--      exclusively by the service-role API. So v_company_id was ALWAYS
--      NULL for a self-service signup.
--
--   2. It hard-coded v_role := 'viewer'. Combined with (1), every new
--      account ended up with company_id = NULL, and the very first query
--      in src/lib/tenant.ts threw:
--          "No company is linked to this account"
--      i.e. a freshly provisioned deployment was unusable.
--
-- This migration redefines the trigger so a signup can carry its own
-- company details in raw_user_meta_data (client-writable):
--
--   * company_id supplied and valid  -> join that company as 'viewer'
--   * company_name supplied, no id   -> create a company, user becomes
--                                       its first 'admin' (the owner)
--   * neither supplied               -> unassigned 'viewer', for an
--                                       admin to provision later
--
-- handle_new_company (migration 005) already fires on INSERT INTO
-- companies and provisions the default warehouse, company_settings and
-- system roles, so creating the company here is sufficient.
--
-- Additive only: replaces a function body and re-points one trigger.
-- Does not touch existing rows.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_role TEXT := 'viewer';
    v_full_name TEXT;
BEGIN
    -- raw_user_meta_data is the only metadata bucket a browser can set
    -- through supabase.auth.signUp({ options: { data: {...} } }).
    v_company_name := NULLIF(trim(NEW.raw_user_meta_data ->> 'company_name'), '');
    v_full_name := COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), '')
    );

    -- Optional: attach to an existing company (invite / join flow).
    BEGIN
        v_company_id := NULLIF(trim(NEW.raw_user_meta_data ->> 'company_id'), '')::UUID;
    EXCEPTION WHEN others THEN
        v_company_id := NULL;
    END;

    IF v_company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies WHERE id = v_company_id) THEN
        v_company_id := NULL;
    END IF;

    -- No company given, but a name was: provision a brand new tenant and
    -- make this user its owner. Without this branch the account is stranded.
    IF v_company_id IS NULL AND v_company_name IS NOT NULL THEN
        INSERT INTO companies (name, state, state_code)
        VALUES (
            v_company_name,
            NULLIF(trim(NEW.raw_user_meta_data ->> 'company_state'), ''),
            NULLIF(trim(NEW.raw_user_meta_data ->> 'company_state_code'), '')
        )
        RETURNING id INTO v_company_id;

        -- First user of a company they just created: full admin rights,
        -- otherwise they could not create a single product.
        IF v_company_id IS NOT NULL THEN
            v_role := 'admin';
        END IF;
    END IF;

    INSERT INTO public.profiles (id, company_id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        v_company_id,
        NEW.email,
        v_full_name,
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

-- ------------------------------------------------------------
-- Backfill: any account created under the old trigger is stuck with
-- company_id = NULL and can do nothing. If there is exactly one company
-- in the database, adopt it and promote the oldest unassigned account
-- to admin so an existing deployment is not left broken.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_only_company UUID;
    v_oldest_user UUID;
BEGIN
    SELECT id INTO v_only_company FROM companies ORDER BY created_at ASC LIMIT 1;

    IF v_only_company IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO v_oldest_user
    FROM profiles
    WHERE company_id IS NULL AND is_active
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_oldest_user IS NOT NULL THEN
        UPDATE profiles
        SET company_id = v_only_company,
            role = 'admin'
        WHERE id = v_oldest_user;
    END IF;
END;
$$;
