-- Clerk-Supabase Integration for GroupShare
-- This script sets up the integration between Clerk and Supabase,
-- updating functions and policies to use Clerk as the primary auth provider

-- STEP 1: CORE INTEGRATION FUNCTIONS

-- Function to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION auth.clerk_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile ID from Clerk user ID
CREATE OR REPLACE FUNCTION public.get_user_profile_id(clerk_id TEXT) RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id
  FROM user_profiles
  WHERE external_auth_id = clerk_id;
  
  RETURN profile_id;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.current_user_profile_id() RETURNS UUID AS $$
BEGIN
  RETURN get_user_profile_id(auth.clerk_user_id());
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if Clerk user exists in our database
CREATE OR REPLACE FUNCTION public.clerk_user_exists() RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE external_auth_id = auth.clerk_user_id()
  ));
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: USER CREATION AND SYNCHRONIZATION

-- Function to automatically create a user profile for Clerk users
CREATE OR REPLACE FUNCTION create_profile_for_clerk_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id TEXT;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- This will be called from a webhook or auth trigger
  new_user_id := NEW.id::text;
  user_email := NEW.email;
  
  -- Build user name from first and last name if available
  IF NEW.first_name IS NOT NULL THEN
    user_name := NEW.first_name;
    IF NEW.last_name IS NOT NULL THEN
      user_name := user_name || ' ' || NEW.last_name;
    END IF;
  ELSE
    user_name := COALESCE(NEW.username, 'User ' || substring(NEW.id, 1, 8));
  END IF;
  
  -- Only insert if user doesn't exist already
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE external_auth_id = new_user_id) THEN
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
      new_user_id,
      user_name,
      user_email,
      'both',
      'basic',
      NEW.image_url,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to handle Clerk webhooks
CREATE OR REPLACE FUNCTION public.handle_clerk_user_creation(
  user_id TEXT,
  email TEXT,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
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
    WHERE external_auth_id = user_id;
    
    result := jsonb_build_object(
      'status', 'updated',
      'user_id', user_id
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
    );
    
    result := jsonb_build_object(
      'status', 'created',
      'user_id', user_id
    );
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
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

-- Automatically create/update user profile on auth changes
CREATE TRIGGER update_user_profile_on_auth_change
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_clerk_user();

-- Log user profile changes for audit trail
CREATE TRIGGER log_user_profile_changes
AFTER INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION log_user_profile_changes();

-- STEP 5: HELPER FUNCTIONS FOR POLICIES

-- Helper function: Check if current Clerk user owns a user_profile
CREATE OR REPLACE FUNCTION clerk_user_owns_profile(profile_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = profile_id 
    AND external_auth_id = auth.clerk_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current Clerk user owns a group
CREATE OR REPLACE FUNCTION clerk_user_owns_group(group_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id
    WHERE g.id = group_id
    AND up.external_auth_id = auth.clerk_user_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current Clerk user is admin of a group
CREATE OR REPLACE FUNCTION clerk_user_is_group_admin(group_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_id
    AND gm.role = 'admin'
    AND gm.status = 'active'
    AND up.external_auth_id = auth.clerk_user_id()
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

-- Add helpful comments
COMMENT ON FUNCTION auth.clerk_user_id IS 'Gets the Clerk user ID from the JWT token';
COMMENT ON FUNCTION public.get_user_profile_id IS 'Gets the internal user profile ID from a Clerk user ID';
COMMENT ON FUNCTION public.current_user_profile_id IS 'Gets the current user''s profile ID based on their Clerk ID';
COMMENT ON FUNCTION public.clerk_user_exists IS 'Checks if a user with the current Clerk ID exists in the database';
COMMENT ON FUNCTION create_profile_for_clerk_user IS 'Automatically creates a user profile for new Clerk users';
COMMENT ON FUNCTION handle_clerk_user_creation IS 'Webhook handler for user creation/updates from Clerk';