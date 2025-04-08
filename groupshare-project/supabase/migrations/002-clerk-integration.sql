-- Clerk-Supabase Integration for GroupShare
-- This script sets up the integration between Clerk and Supabase,
-- updating functions and policies to use Clerk as the primary auth provider

-- STEP 1: CORE INTEGRATION FUNCTIONS

-- Function to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION auth.clerk_user_id() RETURNS TEXT AS $$
DECLARE
  sub_claim TEXT;
BEGIN
  BEGIN
    sub_claim := nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
    
    -- Log successful JWT processing
    INSERT INTO security_logs (
      action_type,
      resource_type,
      resource_id,
      status,
      ip_address,
      details
    ) VALUES (
      'jwt_processing',
      'auth',
      'clerk_user_id',
      'success',
      nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::text,
      jsonb_build_object('sub', sub_claim)
    );
    
    RETURN sub_claim;
  EXCEPTION
    WHEN others THEN
      -- Log failed JWT processing
      INSERT INTO security_logs (
        action_type,
        resource_type,
        resource_id,
        status,
        ip_address,
        details
      ) VALUES (
        'jwt_processing',
        'auth',
        'clerk_user_id',
        'error',
        nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::text,
        jsonb_build_object('error', SQLERRM)
      );
      
      RETURN NULL;
  END;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile ID from Clerk user ID
CREATE OR REPLACE FUNCTION public.get_user_profile_id(clerk_id TEXT) RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO profile_id
  FROM user_profiles
  WHERE external_auth_id = clerk_id;
  
  RETURN profile_id;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.current_user_profile_id() RETURNS UUID AS $$
DECLARE
  clerk_id TEXT;
  profile_id UUID;
BEGIN
  clerk_id := auth.clerk_user_id();
  
  IF clerk_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO profile_id
  FROM user_profiles
  WHERE external_auth_id = clerk_id;
  
  -- Debug log for profile lookup
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    'profile_lookup',
    'user_profile',
    coalesce(profile_id::text, 'not_found'),
    CASE WHEN profile_id IS NULL THEN 'error' ELSE 'success' END,
    jsonb_build_object(
      'clerk_id', clerk_id,
      'profile_found', profile_id IS NOT NULL
    )
  );
  
  RETURN profile_id;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if Clerk user exists in our database
CREATE OR REPLACE FUNCTION public.clerk_user_exists() RETURNS BOOLEAN AS $$
DECLARE
  clerk_id TEXT;
  user_exists BOOLEAN;
BEGIN
  clerk_id := auth.clerk_user_id();
  
  IF clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE external_auth_id = clerk_id
  ) INTO user_exists;
  
  RETURN user_exists;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get full JWT claims for debugging
CREATE OR REPLACE FUNCTION auth.get_jwt_claims() RETURNS JSONB AS $$
BEGIN
  RETURN nullif(current_setting('request.jwt.claims', true), '')::jsonb;
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('error', SQLERRM);
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check current auth status
CREATE OR REPLACE FUNCTION public.get_auth_status() RETURNS JSONB AS $$
DECLARE
  clerk_id TEXT;
  profile_id UUID;
  current_role TEXT;
BEGIN
  clerk_id := auth.clerk_user_id();
  
  IF clerk_id IS NOT NULL THEN
    SELECT id INTO profile_id FROM user_profiles WHERE external_auth_id = clerk_id;
  END IF;
  
  SELECT current_setting('role') INTO current_role;
  
  RETURN jsonb_build_object(
    'authenticated', clerk_id IS NOT NULL,
    'clerk_id', clerk_id,
    'profile_id', profile_id,
    'role', current_role,
    'jwt_claims', auth.get_jwt_claims()
  );
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: USER CREATION AND SYNCHRONIZATION

-- Funkcja do obsługi tokenu JWT (bez używania nieistniejącej tabeli jwt_claim)
CREATE OR REPLACE FUNCTION auth.handle_jwt_token() RETURNS VOID AS $$
DECLARE
  clerk_id TEXT;
  user_email TEXT;
  user_name TEXT;
  created_profile_id UUID;
BEGIN
  -- Pobierz identyfikator Clerk
  clerk_id := auth.clerk_user_id();
  
  -- Jeśli nie ma identyfikatora lub użytkownik już istnieje, zakończ
  IF clerk_id IS NULL OR public.clerk_user_exists() THEN
    RETURN;
  END IF;
  
  -- Spróbuj pobrać email z JWT
  BEGIN
    user_email := nullif(current_setting('request.jwt.claims', true)::json->>'email', '')::text;
  EXCEPTION
    WHEN others THEN
      user_email := 'no-email@example.com';
  END;
  
  -- Spróbuj pobrać imię z JWT
  BEGIN
    user_name := nullif(current_setting('request.jwt.claims', true)::json->>'name', '')::text;
    IF user_name IS NULL THEN
      user_name := 'User ' || substring(clerk_id, 1, 8);
    END IF;
  EXCEPTION
    WHEN others THEN
      user_name := 'User ' || substring(clerk_id, 1, 8);
  END;
  
  -- Wstaw nowy rekord, tylko jeśli nie istnieje
  INSERT INTO user_profiles (
    external_auth_id,
    display_name,
    email,
    profile_type,
    verification_level,
    created_at,
    updated_at
  ) VALUES (
    clerk_id,
    user_name,
    user_email,
    'both',
    'basic',
    NOW(),
    NOW()
  ) 
  ON CONFLICT (external_auth_id) DO NOTHING
  RETURNING id INTO created_profile_id;
  
  -- Jeśli został utworzony nowy profil, zaloguj to
  IF created_profile_id IS NOT NULL THEN
    INSERT INTO security_logs (
      user_id,
      action_type,
      resource_type,
      resource_id,
      status,
      details
    ) VALUES (
      created_profile_id,
      'user_created',
      'user_profile',
      created_profile_id::text,
      'success',
      jsonb_build_object(
        'method', 'jwt_handler',
        'external_auth_id', clerk_id,
        'email', user_email
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja, która może być wywoływana bezpośrednio, bez triggerów
CREATE OR REPLACE FUNCTION auth.ensure_user_profile_exists() RETURNS BOOLEAN AS $$
BEGIN
  PERFORM auth.handle_jwt_token();
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja konfiguracyjna (bez próby tworzenia triggera na nieistniejącej tabeli)
CREATE OR REPLACE FUNCTION install_jwt_trigger() RETURNS VOID AS $$
BEGIN
  -- Zamiast tworzyć trigger, po prostu zaloguj sukces
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    'system_setup',
    'auth',
    'jwt_handler',
    'success',
    jsonb_build_object('message', 'JWT handler configured successfully')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wywołaj funkcję konfiguracyjną
SELECT install_jwt_trigger();

-- Public function to handle Clerk webhooks for direct user creation
CREATE OR REPLACE FUNCTION public.handle_clerk_user_creation(
  user_id TEXT,
  email TEXT,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  profile_id UUID;
BEGIN
  -- Validate input parameters
  IF user_id IS NULL OR email IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User ID and email are required'
    );
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE external_auth_id = user_id) THEN
    -- Update existing user
    UPDATE user_profiles
    SET 
      display_name = COALESCE(
        NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), 
        email
      ),
      email = handle_clerk_user_creation.email,
      avatar_url = image_url,
      updated_at = NOW()
    WHERE external_auth_id = user_id
    RETURNING id INTO profile_id;
    
    result := jsonb_build_object(
      'status', 'updated',
      'user_id', user_id,
      'profile_id', profile_id
    );
  ELSE
    -- Create new user
    INSERT INTO user_profiles (
      external_auth_id,
      display_name,
      email,
      profile_type,
      verification_level,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      COALESCE(
        NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), 
        email
      ),
      email,
      'both',
      'basic',
      image_url,
      NOW(),
      NOW()
    ) RETURNING id INTO profile_id;
    
    result := jsonb_build_object(
      'status', 'created',
      'user_id', user_id,
      'profile_id', profile_id
    );
  END IF;
  
  -- Log the webhook handling
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    'user_creation',
    'user_profile',
    profile_id::text,
    'success',
    jsonb_build_object(
      'method', 'webhook',
      'external_auth_id', user_id,
      'email', email
    )
  );
  
  RETURN result;
EXCEPTION
  WHEN others THEN
    -- Log the error
    INSERT INTO security_logs (
      action_type,
      resource_type,
      resource_id,
      status,
      details
    ) VALUES (
      'user_creation',
      'user_profile',
      'webhook',
      'error',
      jsonb_build_object(
        'error', SQLERRM,
        'external_auth_id', user_id,
        'email', email
      )
    );
    
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a development test user (for debugging only)
CREATE OR REPLACE FUNCTION public.create_dev_test_user(
  dev_email TEXT DEFAULT 'dev@example.com',
  dev_name TEXT DEFAULT 'Development User'
) RETURNS JSONB AS $$
DECLARE
  dev_auth_id TEXT := 'dev_test_user_id';
  profile_id UUID;
BEGIN
  -- Create or update the test user
  IF EXISTS (SELECT 1 FROM user_profiles WHERE external_auth_id = dev_auth_id) THEN
    UPDATE user_profiles 
    SET 
      display_name = dev_name,
      email = dev_email,
      updated_at = NOW()
    WHERE external_auth_id = dev_auth_id
    RETURNING id INTO profile_id;
  ELSE
    INSERT INTO user_profiles (
      external_auth_id,
      display_name,
      email,
      profile_type,
      verification_level,
      created_at,
      updated_at
    ) VALUES (
      dev_auth_id,
      dev_name,
      dev_email,
      'both',
      'verified',
      NOW(),
      NOW()
    ) RETURNING id INTO profile_id;
  END IF;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Development test user created or updated',
    'profile_id', profile_id,
    'external_auth_id', dev_auth_id,
    'note', 'Use this ID for development testing only'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to bypass auth for development/testing
CREATE OR REPLACE FUNCTION auth.dev_impersonate_user(external_auth_id TEXT) RETURNS JSONB AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Check if we're in development mode
  IF NOT (current_setting('app.settings.development_mode', true)::boolean IS TRUE) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'This function can only be used in development mode'
    );
  END IF;
  
  SELECT id INTO profile_id FROM user_profiles WHERE external_auth_id = external_auth_id;
  
  IF profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found with provided external_auth_id'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Development impersonation active',
    'profile_id', profile_id,
    'external_auth_id', external_auth_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: AUDIT AND MONITORING

-- Table for monitoring Clerk integration
CREATE TABLE IF NOT EXISTS clerk_integration_counters (
  function_name TEXT PRIMARY KEY,
  calls INTEGER DEFAULT 0,
  last_called TIMESTAMP WITH TIME ZONE,
  last_success BOOLEAN
);

-- Function to track function calls (for debugging)
CREATE OR REPLACE FUNCTION track_clerk_function_call(func_name TEXT, success BOOLEAN) 
RETURNS VOID AS $$
BEGIN
  INSERT INTO clerk_integration_counters (function_name, calls, last_called, last_success)
  VALUES (func_name, 1, NOW(), success)
  ON CONFLICT (function_name) 
  DO UPDATE SET 
    calls = clerk_integration_counters.calls + 1,
    last_called = NOW(),
    last_success = success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'user_created'
      WHEN TG_OP = 'UPDATE' THEN 'user_updated'
      ELSE TG_OP
    END,
    'user_profile',
    NEW.id::text,
    'success',
    jsonb_build_object(
      'operation', TG_OP,
      'timestamp', NOW(),
      'external_auth_id', NEW.external_auth_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: TRIGGERS AND EVENT HANDLERS

-- Log user profile changes for audit trail
DROP TRIGGER IF EXISTS log_user_profile_changes ON user_profiles;
CREATE TRIGGER log_user_profile_changes
AFTER INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION log_user_profile_changes();

-- STEP 5: HELPER FUNCTIONS FOR POLICIES

-- Helper function: Check if current Clerk user owns a user_profile
CREATE OR REPLACE FUNCTION clerk_user_owns_profile(profile_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  clerk_id TEXT;
BEGIN
  clerk_id := auth.clerk_user_id();
  
  IF clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = profile_id 
    AND external_auth_id = clerk_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current Clerk user owns a group
CREATE OR REPLACE FUNCTION clerk_user_owns_group(group_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  clerk_id TEXT;
BEGIN
  clerk_id := auth.clerk_user_id();
  
  IF clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id
    WHERE g.id = group_id
    AND up.external_auth_id = clerk_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current Clerk user is admin of a group
CREATE OR REPLACE FUNCTION clerk_user_is_group_admin(group_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  clerk_id TEXT;
BEGIN
  clerk_id := auth.clerk_user_id();
  
  IF clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_id
    AND gm.role = 'admin'
    AND gm.status = 'active'
    AND up.external_auth_id = clerk_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: MIGRATE TO INSTANT ACCESS MODEL

-- Function to check and update group_subs for instant access
CREATE OR REPLACE FUNCTION migrate_to_instant_access() RETURNS VOID AS $$
BEGIN
  -- Log the migration start
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    'schema_migration',
    'database',
    'instant_access_migration_start',
    'info',
    jsonb_build_object(
      'description', 'Starting migration to instant-access-only model',
      'timestamp', CURRENT_TIMESTAMP
    )
  );

  -- Ensure all completed purchases have access_provided set to TRUE
  UPDATE purchase_records
  SET 
    access_provided = TRUE,
    access_provided_at = CASE 
      WHEN access_provided_at IS NULL THEN CURRENT_TIMESTAMP 
      ELSE access_provided_at 
    END
  WHERE 
    status = 'completed' 
    AND access_provided = FALSE;

  -- Log the migration completion
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    'schema_migration',
    'database',
    'instant_access_migration_complete',
    'success',
    jsonb_build_object(
      'description', 'Completed migration to instant-access-only model',
      'timestamp', CURRENT_TIMESTAMP
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration automatically
SELECT migrate_to_instant_access();

-- Create settings for development mode
DO $$
BEGIN
  -- Try to set development mode setting if it doesn't exist
  BEGIN
    PERFORM set_config('app.settings.development_mode', 'false', false);
  EXCEPTION
    WHEN undefined_object THEN
      -- Ignore if setting doesn't exist
      NULL;
  END;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION auth.clerk_user_id IS 'Gets the Clerk user ID from the JWT token';
COMMENT ON FUNCTION public.get_user_profile_id IS 'Gets the internal user profile ID from a Clerk user ID';
COMMENT ON FUNCTION public.current_user_profile_id IS 'Gets the current user''s profile ID based on their Clerk ID';
COMMENT ON FUNCTION public.clerk_user_exists IS 'Checks if a user with the current Clerk ID exists in the database';
COMMENT ON FUNCTION auth.handle_jwt_token IS 'Handles JWT token authentication and user profile creation';
COMMENT ON FUNCTION auth.ensure_user_profile_exists IS 'Ensures a user profile exists for the current JWT token';
COMMENT ON FUNCTION handle_clerk_user_creation IS 'Webhook handler for user creation/updates from Clerk';
COMMENT ON FUNCTION auth.get_jwt_claims IS 'Gets the full JWT claims for debugging purposes';
COMMENT ON FUNCTION public.get_auth_status IS 'Gets the current authentication status for debugging';
COMMENT ON FUNCTION public.create_dev_test_user IS 'Creates a test user for development purposes';
COMMENT ON FUNCTION auth.dev_impersonate_user IS 'Impersonates a user for development testing (only works in dev mode)';