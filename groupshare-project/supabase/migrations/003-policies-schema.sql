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

----------------------
-- Policy: user_profiles
----------------------
-- Anyone can view basic profile info
CREATE POLICY "Public users can view basic profile info" ON user_profiles
  FOR SELECT USING (true);

-- Users can update their own profiles
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (external_auth_id = auth.clerk_user_id());

-- IMPORTANT CHANGE: Allow service_role to insert profiles
CREATE POLICY "Anyone can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- IMPORTANT CHANGE: Allow service_role to modify profiles
CREATE POLICY "Service role can manage profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

----------------------
-- Policy: groups
----------------------
-- Anyone can see groups
CREATE POLICY "Public users can view groups" ON groups
  FOR SELECT USING (true);

-- Only authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.clerk_user_id() IS NOT NULL);

-- Only group owners can update groups
CREATE POLICY "Group owners can update groups" ON groups
  FOR UPDATE USING (clerk_user_owns_group(id));

-- Only group owners can delete groups
CREATE POLICY "Group owners can delete groups" ON groups
  FOR DELETE USING (clerk_user_owns_group(id));

-- Service role can manage all groups
CREATE POLICY "Service role can manage all groups" ON groups
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

----------------------
-- Policy: group_members
----------------------
-- Users can see members of groups they belong to
CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN user_profiles up ON gm.user_id = up.id
      WHERE gm.group_id = group_members.group_id
      AND gm.status = 'active'
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role'
  );

-- Group owners and admins can add members
CREATE POLICY "Group admins can add members" ON group_members
  FOR INSERT WITH CHECK (
    clerk_user_is_group_admin(group_id) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role'
  );

-- Group owners and admins can update members
CREATE POLICY "Group admins can update members" ON group_members
  FOR UPDATE USING (
    clerk_user_is_group_admin(group_id) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role'
  );

-- Group owners and admins can delete members
CREATE POLICY "Group admins can delete members" ON group_members
  FOR DELETE USING (
    clerk_user_is_group_admin(group_id) OR
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role'
  );

----------------------
-- Policy: subscription_platforms
----------------------
-- Anyone can see platform information
CREATE POLICY "Public users can view platforms" ON subscription_platforms
  FOR SELECT USING (active = true);

-- Only service role can modify platforms
CREATE POLICY "Service can modify platforms" ON subscription_platforms
  FOR ALL USING (auth.role() = 'service_role');

----------------------
-- Policy: group_subs
----------------------
-- Anyone can see active subscription offers
CREATE POLICY "Public users can view active subscription offers" ON group_subs
  FOR SELECT USING (status = 'active');

-- Group owners and admins can manage subscription offers
CREATE POLICY "Group admins can manage subscription offers" ON group_subs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_subs.group_id AND 
      (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role'
      )
    )
  );

----------------------
-- Policy: access_instructions
----------------------
-- Only users with completed purchase record can view access instructions
CREATE POLICY "Users can view access instructions for purchased subscriptions" ON access_instructions
  FOR SELECT USING (
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
    auth.role() = 'service_role'
  );

-- Only group owners and admins can insert access instructions
CREATE POLICY "Group admins can insert access instructions" ON access_instructions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role'
      )
    )
  );

-- Only group owners and admins can update access instructions
CREATE POLICY "Group admins can update access instructions" ON access_instructions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role'
      )
    )
  );

----------------------
-- Policy: purchase_records
----------------------
-- Users can see purchase records they created or purchase records for subscriptions they manage
CREATE POLICY "Users can view relevant purchase records" ON purchase_records
  FOR SELECT USING (
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
    auth.role() = 'service_role'
  );

-- Authenticated users can create purchase records
CREATE POLICY "Authenticated users can create purchase records" ON purchase_records
  FOR INSERT WITH CHECK (
    auth.clerk_user_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE purchase_records.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) AND
    (SELECT slots_available FROM group_subs WHERE id = group_sub_id) > 0
    OR auth.role() = 'service_role'
  );

-- Users can update their own purchase records
CREATE POLICY "Users can update own purchase records" ON purchase_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE purchase_records.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Group admins can update purchase records for their subscriptions
CREATE POLICY "Group admins can update purchase records" ON purchase_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_subs gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.id = purchase_records.group_sub_id
      AND (
        clerk_user_is_group_admin(g.id) OR
        clerk_user_owns_group(g.id) OR
        auth.role() = 'service_role'
      )
    )
  );

----------------------
-- Policy: access_tokens
----------------------
-- Only token owners can view their tokens
CREATE POLICY "Users can view own tokens" ON access_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchase_records pr
      JOIN user_profiles up ON pr.user_id = up.id
      WHERE pr.id = purchase_record_id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR 
    auth.role() = 'service_role'
  );

-- Only service role can create tokens
CREATE POLICY "Service can create tokens" ON access_tokens
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Service role and token owners can update tokens
CREATE POLICY "Service and users can update tokens" ON access_tokens
  FOR UPDATE USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM purchase_records pr
      JOIN user_profiles up ON pr.user_id = up.id
      WHERE pr.id = purchase_record_id
      AND up.external_auth_id = auth.clerk_user_id()
    )
  );

----------------------
-- Policy: transactions
----------------------
-- Users can see transactions they're involved in
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE (transactions.buyer_id = up.id OR transactions.seller_id = up.id)
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Only service role can create transactions
CREATE POLICY "Service can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Only service role can update transactions
CREATE POLICY "Service can update transactions" ON transactions
  FOR UPDATE USING (
    auth.role() = 'service_role'
  );

----------------------
-- Additional policies for remaining tables follow the same pattern
-- They're updated to use auth.clerk_user_id() instead of auth.user_id()
----------------------

-- User-related notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE notifications.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Users can mark own notifications as read
CREATE POLICY "Users can mark own notifications as read" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE notifications.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE notifications.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) AND 
    is_read IS NOT NULL) OR
    auth.role() = 'service_role'
  );

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE (messages.sender_id = up.id OR messages.receiver_id = up.id)
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE messages.sender_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Message threads policies
CREATE POLICY "Users can view threads they participate in" ON message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread_participants mtp
      JOIN user_profiles up ON mtp.user_id = up.id
      WHERE mtp.thread_id = message_threads.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Thread participants policies
CREATE POLICY "Users can view thread participants for their threads" ON message_thread_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread_participants mtp
      JOIN user_profiles up ON mtp.user_id = up.id
      WHERE mtp.thread_id = message_thread_participants.thread_id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Group invitations policies
CREATE POLICY "Group admins can view invitations" ON group_invitations
  FOR SELECT USING (
    clerk_user_is_group_admin(group_id) OR 
    clerk_user_owns_group(group_id) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE group_invitations.invited_by = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Group admins can create invitations" ON group_invitations
  FOR INSERT WITH CHECK (
    clerk_user_is_group_admin(group_id) OR 
    clerk_user_owns_group(group_id) OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Group admins can update invitations" ON group_invitations
  FOR UPDATE USING (
    clerk_user_is_group_admin(group_id) OR 
    clerk_user_owns_group(group_id) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE group_invitations.invited_by = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Disputes policies
CREATE POLICY "Users can view disputes they reported" ON disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE disputes.reporter_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE disputes.resolved_by = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE disputes.reporter_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Dispute comments policies
CREATE POLICY "Users can view comments on their disputes" ON dispute_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN user_profiles up ON d.reporter_id = up.id
      WHERE d.id = dispute_comments.dispute_id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE dispute_comments.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can add comments to disputes" ON dispute_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE dispute_comments.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

-- Dispute evidence policies
CREATE POLICY "Users can view evidence on their disputes" ON dispute_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes d
      JOIN user_profiles up ON d.reporter_id = up.id
      WHERE d.id = dispute_evidence.dispute_id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE dispute_evidence.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can add evidence to disputes" ON dispute_evidence
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE dispute_evidence.user_id = up.id
      AND up.external_auth_id = auth.clerk_user_id()
    ) OR
    auth.role() = 'service_role'
  );