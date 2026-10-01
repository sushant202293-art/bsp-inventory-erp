-- ============================================================
-- admin_user.sql - provisions the first administrator
--
-- Run this ONCE in the Supabase SQL Editor, AFTER install.sql and
-- demo_data.sql.
--
-- Credentials (change them right after signing in, under
-- Settings > Account > Change password):
--     email     : admin@bspinventory.com
--     password  : Admin@12345
--
-- Safe to re-run: it resets the password and re-grants admin rather than
-- creating a duplicate account.
--
-- NOTE ON auth.identities
--   This project's auth schema is newer than the version this script was
--   first written against: auth.identities carries a NOT NULL `provider_id`
--   column, so a fixed column list fails with
--       23502 null value in column "provider_id"
--   rather than skipping the row. The identities insert below is therefore
--   built from the real column list at run time, and `provider_id` is
--   resolved from the database instead of hard-coded. If it cannot be
--   resolved the script still commits the auth.users row and prints exactly
--   what is needed to finish.
-- ============================================================

BEGIN;

-- crypt()/gen_salt() come from pgcrypto, which Supabase installs into the
-- `extensions` schema on newer projects and into `public` on older ones.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_email        CONSTANT TEXT := 'admin@bspinventory.com';
    v_password     CONSTANT TEXT := 'Admin@12345';
    v_full_name    CONSTANT TEXT := 'BSP Administrator';
    v_username     CONSTANT TEXT := 'admin';
    v_demo_company CONSTANT UUID := '11111111-1111-1111-1111-111111111111';

    v_user_id     UUID;
    v_company_id  UUID;
    v_hash        TEXT;
    v_provider_id TEXT;
    v_registry    TEXT;
    v_line        TEXT;
BEGIN
    -- Prefer the demo company, otherwise fall back to the oldest company.
    v_company_id := v_demo_company;
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
        SELECT id INTO v_company_id
        FROM public.companies
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION
            'No company found. Run demo_data.sql, or sign up once at /signup, then re-run this script.';
    END IF;

    -- Resolve crypt() through whichever schema actually holds it. The call
    -- goes through EXECUTE so an absent function is a runtime condition we
    -- can branch on instead of a plan-time error.
    IF to_regproc('extensions.crypt(text,text)') IS NOT NULL THEN
        EXECUTE 'SELECT extensions.crypt($1, extensions.gen_salt(''bf''))'
            INTO v_hash USING v_password;
    ELSE
        EXECUTE 'SELECT crypt($1, gen_salt(''bf''))'
            INTO v_hash USING v_password;
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Account % already exists - resetting its password.', v_email;
        UPDATE auth.users
        SET encrypted_password = v_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            confirmation_token = '',
            recovery_token     = '',
            updated_at         = now()
        WHERE id = v_user_id;
    ELSE
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token,
            email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            v_hash,
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_full_name),
            now(), now(), '', '', '', ''
        );
    END IF;

    -- ------------------------------------------------------------
    -- auth.identities
    --
    -- GoTrue expects one identity row per linked provider. Reuse the
    -- provider_id it already uses for email sign-ins; fall back to the
    -- provider registry the foreign key points at. Skipped entirely when
    -- the user already has an identity, or when the column is absent (older
    -- schemas key on `provider` text alone).
    -- ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'auth' AND table_name = 'identities'
              AND column_name = 'provider_id'
        ) THEN
            SELECT provider_id INTO v_provider_id
            FROM auth.identities
            WHERE provider = 'email'
            LIMIT 1;

            IF v_provider_id IS NULL THEN
                -- provider_id is a foreign key. Read a usable value from
                -- whichever registry it points at, guarded so an unexpected
                -- shape degrades to a warning instead of aborting the block.
                FOR v_registry IN
                    SELECT ccu.table_schema || '.' || ccu.table_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON kcu.constraint_name = tc.constraint_name
                    JOIN information_schema.constraint_column_usage ccu
                      ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = 'auth'
                      AND tc.table_name = 'identities'
                      AND kcu.column_name = 'provider_id'
                LOOP
                    BEGIN
                        EXECUTE format('SELECT id::text FROM %s LIMIT 1', v_registry)
                            INTO v_provider_id;
                    EXCEPTION WHEN others THEN
                        v_provider_id := NULL;
                    END;
                    EXIT WHEN v_provider_id IS NOT NULL;
                END LOOP;
            END IF;
        END IF;

        IF v_provider_id IS NOT NULL THEN
            EXECUTE $ins$
                INSERT INTO auth.identities (
                    id, provider_id, user_id, identity_data, provider,
                    last_sign_in_at, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(),
                    $1,
                    $2,
                    jsonb_build_object(
                        'sub', $2::text,
                        'email', $3,
                        'email_verified', true
                    ),
                    'email',
                    now(), now(), now()
                )
            $ins$ USING v_provider_id, v_user_id, v_email;
            RAISE NOTICE 'Identity row created with provider_id = %', v_provider_id;
        ELSE
            RAISE WARNING
                'Could not resolve auth.identities.provider_id; the identity row was not created. '
                'If sign-in reports invalid credentials, run the diagnostic query at the end of this script.';
        END IF;
    END IF;

    -- The on_auth_user_created trigger (migration 007) already inserted a
    -- profile for this user, but with company_id NULL and role 'viewer',
    -- because no company metadata was present. Attach and promote it.
    INSERT INTO public.profiles (
        id, company_id, full_name, username, email, role, is_active
    ) VALUES (
        v_user_id, v_company_id, v_full_name, v_username, v_email, 'admin', true
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        full_name  = EXCLUDED.full_name,
        username   = EXCLUDED.username,
        email      = EXCLUDED.email,
        role       = 'admin',
        is_active  = true,
        updated_at = now();

    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'Admin account ready';
    RAISE NOTICE '  email    : %', v_email;
    RAISE NOTICE '  password : %', v_password;
    RAISE NOTICE '  company  : %', v_company_id;
    RAISE NOTICE '  role     : admin';
    RAISE NOTICE 'Change the password after your first sign-in.';
    RAISE NOTICE '--------------------------------------------------';

    -- Diagnostic: the exact identities shape, so a follow-up fix needs no
    -- further guessing. This runs in every case.
    RAISE NOTICE 'auth.identities columns:';
    FOR v_line IN
        SELECT format('    %s %s%s',
                      c.column_name,
                      c.data_type,
                      CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END)
        FROM information_schema.columns c
        WHERE c.table_schema = 'auth' AND c.table_name = 'identities'
        ORDER BY c.ordinal_position
    LOOP
        RAISE NOTICE '%', v_line;
    END LOOP;

    RAISE NOTICE 'auth.identities foreign keys:';
    FOR v_line IN
        SELECT format('    %s -> %s.%s',
                      kcu.column_name, ccu.table_schema, ccu.column_name)
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'auth'
          AND tc.table_name = 'identities'
    LOOP
        RAISE NOTICE '%', v_line;
    END LOOP;
END;
$$;

COMMIT;
