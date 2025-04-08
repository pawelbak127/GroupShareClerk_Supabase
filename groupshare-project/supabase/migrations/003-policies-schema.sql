-- Row Level Security Policies for GroupShare (Updated for Clerk)
-- This script sets up RLS policies to secure data access using Clerk JWTs

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE clerk_integration_counters ENABLE ROW LEVEL SECURITY;

----------------------
-- Policy: user_profiles
----------------------
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public users can view basic profile info" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anon can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;

-- Anyone including anonymous users can view basic profile info
CREATE POLICY "Public users can view basic profile info" ON user_profiles
  FOR SELECT TO PUBLIC USING (true);

-- Users can update their own profiles
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (external_auth_id = auth.clerk_user_id());

-- Service role and authenticated users can insert profiles
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage profiles" ON user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Development bypass policy (only active in development mode)
CREATE OR REPLACE FUNCTION is_development_mode() RETURNS BOOLEAN AS $$
BEGIN
  -- Try to get the development mode setting
  BEGIN
    RETURN current_setting('app.settings.development_mode', true)::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Development mode bypass for profiles" ON user_profiles
  USING (is_development_mode()) WITH CHECK (is_development_mode());

----------------------
-- Policy: groups
----------------------
-- Drop existing policies first
DROP POLICY IF EXISTS "Public users can view groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON groups;
DROP POLICY IF EXISTS "Service role can manage all groups" ON groups;

-- Anyone can see groups
CREATE POLICY "Public users can view groups" ON groups
  FOR SELECT TO PUBLIC USING (true);

-- Only authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT TO authenticated WITH CHECK (auth.clerk_user_id() IS NOT NULL);

-- Only group owners can update groups
CREATE POLICY "Group owners can update groups" ON groups
  FOR UPDATE TO authenticated USING (clerk_user_owns_group(id));

-- Only group owners can delete groups
CREATE POLICY "Group owners can delete groups" ON groups
  FOR DELETE TO authenticated USING (clerk_user_owns_group(id));

-- Service role can manage all groups
CREATE POLICY "Service role can manage all groups" ON groups
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Development bypass policy
CREATE POLICY "Development mode bypass for groups" ON groups
  USING (is_development_mode()) WITH CHECK (is_development_mode());

----------------------
-- Policy: group_members
----------------------
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
DROP POLICY IF EXISTS "Group admins can update members" ON group_members;
DROP POLICY IF EXISTS "Group admins can delete members" ON group_members;

-- Users can see members of groups they belong to
CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT TO PUBLIC USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN user_profiles up ON gm.user_id = up.id
      WHERE gm.group_id = group_members.group_id
      AND gm.status = 'active'
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Group owners and admins can add members
CREATE POLICY "Group admins can add members" ON group_members
  FOR INSERT TO authenticated WITH CHECK (
    clerk_user_is_group_admin(group_id) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Group owners and admins can update members
CREATE POLICY "Group admins can update members" ON group_members
  FOR UPDATE TO authenticated USING (
    clerk_user_is_group_admin(group_id) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Group owners and admins can delete members
CREATE POLICY "Group admins can delete members" ON group_members
  FOR DELETE TO authenticated USING (
    clerk_user_is_group_admin(group_id) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

----------------------
-- Policy: subscription_platforms
----------------------
-- Drop existing policies first
DROP POLICY IF EXISTS "Public users can view platforms" ON subscription_platforms;
DROP POLICY IF EXISTS "Service can modify platforms" ON subscription_platforms;

-- Anyone can see platform information
CREATE POLICY "Public users can view platforms" ON subscription_platforms
  FOR SELECT TO PUBLIC USING (active = true);

-- Only service role can modify platforms
CREATE POLICY "Service can modify platforms" ON subscription_platforms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Development bypass policy
CREATE POLICY "Development mode bypass for platforms" ON subscription_platforms
  USING (is_development_mode()) WITH CHECK (is_development_mode());

----------------------
-- Policy: group_subs
----------------------
-- Drop existing policies first
DROP POLICY IF EXISTS "Public users can view active subscription offers" ON group_subs;
DROP POLICY IF EXISTS "Group admins can manage subscription offers" ON group_subs;

-- Anyone can see active subscription offers
CREATE POLICY "Public users can view active subscription offers" ON group_subs
  FOR SELECT TO PUBLIC USING (status = 'active');

-- Group owners and admins can manage subscription offers
CREATE POLICY "Group admins can manage subscription offers" ON group_subs
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_subs.group_id AND 
      (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_subs.group_id AND 
      (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  );

-- Service role can manage all group_subs
CREATE POLICY "Service role can manage all group_subs" ON group_subs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

----------------------
-- Policy: access_instructions
----------------------
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view access instructions for purchased subscriptions" ON access_instructions;
DROP POLICY IF EXISTS "Group admins can insert access instructions" ON access_instructions;
DROP POLICY IF EXISTS "Group admins can update access instructions" ON access_instructions;

-- Only users with completed purchase record can view access instructions
CREATE POLICY "Users can view access instructions for purchased subscriptions" ON access_instructions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 
      FROM purchase_records pr
      JOIN user_profiles up ON pr.user_id = up.id
      WHERE pr.group_sub_id = access_instructions.group_sub_id
      AND up.external_auth_id = auth.clerk_user_id()
      AND pr.status = 'completed'
      AND pr.access_provided = TRUE
    ) OR
    EXISTS (
      SELECT 1
      FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      JOIN user_profiles up ON g.owner_id = up.id
      WHERE gs.id = access_instructions.group_sub_id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Only group owners and admins can insert access instructions
CREATE POLICY "Group admins can insert access instructions" ON access_instructions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  );

-- Only group owners and admins can update access instructions
CREATE POLICY "Group admins can update access instructions" ON access_instructions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  );

-- Service role can manage all access_instructions
CREATE POLICY "Service role can manage all access_instructions" ON access_instructions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

----------------------
-- Policy: purchase_records
----------------------
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view relevant purchase records" ON purchase_records;
DROP POLICY IF EXISTS "Authenticated users can create purchase records" ON purchase_records;
DROP POLICY IF EXISTS "Users can update own purchase records" ON purchase_records;
DROP POLICY IF EXISTS "Group admins can update purchase records" ON purchase_records;

-- Users can see purchase records they created or purchase records for subscriptions they manage
CREATE POLICY "Users can view relevant purchase records" ON purchase_records
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE purchase_records.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      JOIN user_profiles up ON g.owner_id = up.id
      WHERE gs.id = purchase_records.group_sub_id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Authenticated users can create purchase records
CREATE POLICY "Authenticated users can create purchase records" ON purchase_records
  FOR INSERT TO authenticated WITH CHECK (
    (auth.clerk_user_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE purchase_records.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) AND
    (SELECT slots_available FROM group_subs WHERE id = group_sub_id) > 0) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Users can update their own purchase records
CREATE POLICY "Users can update own purchase records" ON purchase_records
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE purchase_records.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE purchase_records.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role' OR
    is_development_mode()
  );

-- Group admins can update purchase records for their subscriptions
CREATE POLICY "Group admins can update purchase records" ON purchase_records
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = purchase_records.group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = purchase_records.group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role' OR
        is_development_mode()
      )
    )
  );

-- Service role can manage all purchase_records
CREATE POLICY "Service role can manage all purchase_records" ON purchase_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

----------------------
-- Configuring additional policies for security and convenience
----------------------

-- Create policy for security_logs to allow service_role access
CREATE POLICY "Service role can access security logs" ON security_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create policy for development access to logs
CREATE POLICY "Development access to security logs" ON security_logs
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- Create policy for allowing users to see their own security logs
CREATE POLICY "Users can view their own security logs" ON security_logs
  FOR SELECT TO authenticated USING (
    user_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE security_logs.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    )
  );

-- Create policy for clerk_integration_counters
CREATE POLICY "Service role can access integration counters" ON clerk_integration_counters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create policy for development access to integration counters
CREATE POLICY "Development access to integration counters" ON clerk_integration_counters
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- Create development bypass policies for all remaining tables
-- This allows all operations in development mode

-- Note: In a real production environment, you would set proper policies for each table
-- The following are development-only policies to help with debugging

-- For access_tokens
CREATE POLICY "Development mode bypass for access_tokens" ON access_tokens
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For transactions
CREATE POLICY "Development mode bypass for transactions" ON transactions
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For ratings
CREATE POLICY "Development mode bypass for ratings" ON ratings
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For encryption_keys
CREATE POLICY "Development mode bypass for encryption_keys" ON encryption_keys
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For device_fingerprints
CREATE POLICY "Development mode bypass for device_fingerprints" ON device_fingerprints
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For notifications
CREATE POLICY "Development mode bypass for notifications" ON notifications
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For messages
CREATE POLICY "Development mode bypass for messages" ON messages
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For message_threads
CREATE POLICY "Development mode bypass for message_threads" ON message_threads
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For message_thread_participants
CREATE POLICY "Development mode bypass for message_thread_participants" ON message_thread_participants
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For group_invitations
CREATE POLICY "Development mode bypass for group_invitations" ON group_invitations
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For disputes
CREATE POLICY "Development mode bypass for disputes" ON disputes
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For dispute_comments
CREATE POLICY "Development mode bypass for dispute_comments" ON dispute_comments
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- For dispute_evidence
CREATE POLICY "Development mode bypass for dispute_evidence" ON dispute_evidence
  USING (is_development_mode()) WITH CHECK (is_development_mode());

-- Function to enable development mode (for local development and testing only)
CREATE OR REPLACE FUNCTION public.enable_development_mode(enable BOOLEAN DEFAULT TRUE) RETURNS JSONB AS $$
BEGIN
  PERFORM set_config('app.settings.development_mode', enable::text, false);
  
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    details
  ) VALUES (
    'system_config',
    'settings',
    'development_mode',
    'success',
    jsonb_build_object(
      'enabled', enable,
      'timestamp', NOW()
    )
  );
  
  RETURN jsonb_build_object(
    'status', 'success',
    'development_mode', enable,
    'warning', CASE WHEN enable THEN 'Development mode enabled - DO NOT USE IN PRODUCTION!' ELSE 'Development mode disabled' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining development mode
COMMENT ON FUNCTION public.enable_development_mode IS 'Enables or disables development mode for bypassing RLS policies. DO NOT USE IN PRODUCTION!';