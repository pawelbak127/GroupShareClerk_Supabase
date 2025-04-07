-- Optimizations for GroupShare
-- This script adds indexes, materialized views and performance improvements

-- Add indexes for better performance
CREATE INDEX idx_user_profiles_external_auth_id ON user_profiles(external_auth_id);
CREATE INDEX idx_user_profiles_profile_type ON user_profiles(profile_type);
CREATE INDEX idx_groups_owner_id ON groups(owner_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_subs_group_id ON group_subs(group_id);
CREATE INDEX idx_group_subs_platform_id ON group_subs(platform_id);
CREATE INDEX idx_group_subs_status ON group_subs(status);
CREATE INDEX idx_access_instructions_group_sub_id ON access_instructions(group_sub_id);
CREATE INDEX idx_purchase_records_user_id ON purchase_records(user_id);
CREATE INDEX idx_purchase_records_group_sub_id ON purchase_records(group_sub_id);
CREATE INDEX idx_purchase_records_status ON purchase_records(status);
CREATE INDEX idx_purchase_records_access_provided ON purchase_records(access_provided);
CREATE INDEX idx_access_tokens_purchase_record_id ON access_tokens(purchase_record_id);
CREATE INDEX idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_transactions_purchase_record_id ON transactions(purchase_record_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX idx_ratings_transaction_id ON ratings(transaction_id);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(active);
CREATE INDEX idx_encryption_keys_related_id ON encryption_keys(related_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_action_type ON security_logs(action_type);
CREATE INDEX idx_security_logs_resource_type_id ON security_logs(resource_type, resource_id);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_fingerprint ON device_fingerprints(fingerprint);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_threads_related_entity ON message_threads(related_entity_type, related_entity_id);
CREATE INDEX idx_message_thread_participants_user_id ON message_thread_participants(user_id);
CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_email ON group_invitations(email);
CREATE INDEX idx_group_invitations_token ON group_invitations(invitation_token);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_disputes_reporter_id ON disputes(reporter_id);
CREATE INDEX idx_disputes_reported_entity ON disputes(reported_entity_type, reported_entity_id);
CREATE INDEX idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_dispute_comments_dispute_id ON dispute_comments(dispute_id);
CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- Compound indexes for common query patterns
CREATE INDEX idx_group_members_group_user ON group_members(group_id, user_id);
CREATE INDEX idx_purchase_records_user_status ON purchase_records(user_id, status);
CREATE INDEX idx_purchase_records_group_sub_status ON purchase_records(group_sub_id, status);
CREATE INDEX idx_transactions_buyer_status ON transactions(buyer_id, status);
CREATE INDEX idx_transactions_seller_status ON transactions(seller_id, status);
CREATE INDEX idx_security_logs_user_action ON security_logs(user_id, action_type);

-- Indeks dla zapytań zakresowych dla dat
CREATE INDEX idx_transactions_date_range ON transactions(created_at);

-- Dodanie INCLUDE dla unikania operacji lookup
CREATE INDEX idx_group_subs_lookup ON group_subs(id) INCLUDE (group_id, slots_available, status);

-- Indeks dla funkcji tekstowej
CREATE INDEX idx_user_profiles_display_name_lower ON user_profiles(LOWER(display_name));

-- Indeksy częściowe dla statusów
CREATE INDEX idx_purchase_records_completed ON purchase_records(user_id) 
WHERE status = 'completed';

CREATE INDEX idx_transactions_pending ON transactions(buyer_id, created_at) 
WHERE status = 'pending';

-- Indeksowanie z uwzględnieniem kolejności kolumn
CREATE INDEX idx_notifications_user_read_date ON notifications(user_id, is_read, created_at DESC);

-- Create materialized views for frequently used queries
-- User statistics materialized view
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
    up.id,
    up.display_name,
    up.profile_type,
    up.verification_level,
    up.rating_avg,
    up.rating_count,
    count(distinct gs.id) as subscriptions_offered,
    sum(case when gs.status = 'active' then gs.slots_available else 0 end) as slots_available,
    count(distinct pr.id) as purchases_made,
    count(distinct case when pr.status = 'completed' then pr.id else null end) as active_subscriptions
FROM 
    user_profiles up
LEFT JOIN 
    groups g ON up.id = g.owner_id
LEFT JOIN 
    group_subs gs ON g.id = gs.group_id
LEFT JOIN 
    purchase_records pr ON up.id = pr.user_id
GROUP BY 
    up.id, up.display_name, up.profile_type, up.verification_level, up.rating_avg, up.rating_count;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_user_stats_id ON user_stats(id);

-- Platform statistics materialized view
CREATE MATERIALIZED VIEW platform_stats AS
SELECT 
    sp.id,
    sp.name,
    sp.max_members,
    count(distinct gs.id) as active_groups,
    sum(gs.slots_total) as total_slots,
    sum(gs.slots_total - gs.slots_available) as used_slots,
    avg(gs.price_per_slot) as avg_price_per_slot
FROM 
    subscription_platforms sp
LEFT JOIN 
    group_subs gs ON sp.id = gs.platform_id AND gs.status IN ('active', 'full')
GROUP BY 
    sp.id, sp.name, sp.max_members;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_platform_stats_id ON platform_stats(id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats;
END;
$$ LANGUAGE plpgsql;

-- User profile validation trigger
CREATE OR REPLACE FUNCTION validate_user_update() RETURNS TRIGGER AS $$
BEGIN
    -- Sprawdzenie, czy profile_type i verification_level są zgodne
    IF NEW.profile_type = 'seller' AND NEW.verification_level = 'basic' THEN
        RAISE WARNING 'Zalecane jest wyższe verification_level dla sprzedawców';
    END IF;
    
    -- Walidacja długości bio
    IF length(NEW.bio) > 500 THEN
        NEW.bio := substring(NEW.bio from 1 for 500);
        RAISE NOTICE 'Bio zostało przycięte do 500 znaków';
    END IF;
    
    -- Sprawdzenie, czy avatar_url jest poprawnym URL
    IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url !~* '^https?://[^\s/$.?#].[^\s]*$' THEN
        RAISE WARNING 'avatar_url powinien być poprawnym URL';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_validation
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE PROCEDURE validate_user_update();

-- Add demo data for testing (optional)
DO $$
DECLARE
    master_key_id UUID;
    user_id_1 UUID;
    user_id_2 UUID;
    group_id UUID;
    platform_id UUID;
    group_sub_id UUID;
BEGIN
    -- Insert a master encryption key (only for demo)
    INSERT INTO encryption_keys (
        key_type,
        public_key,
        private_key_enc,
        active
    ) VALUES (
        'master',
        'dummy_public_key_for_development',
        'dummy_encrypted_private_key_for_development',
        true
    ) RETURNING id INTO master_key_id;

    -- Create test users
    INSERT INTO user_profiles (
        external_auth_id, 
        display_name,
        email,
        phone_number,
        profile_type,
        verification_level,
        bio
    ) VALUES (
        'demo_seller',
        'Demo Seller',
        'seller@example.com',
        '+48123456789',
        'seller',
        'verified',
        'Demo seller account for testing'
    ) RETURNING id INTO user_id_1;

    INSERT INTO user_profiles (
        external_auth_id, 
        display_name,
        email,
        phone_number,
        profile_type,
        verification_level,
        bio
    ) VALUES (
        'demo_buyer',
        'Demo Buyer',
        'buyer@example.com',
        '+48987654321',
        'buyer',
        'basic',
        'Demo buyer account for testing'
    ) RETURNING id INTO user_id_2;

    -- Create demo group
    INSERT INTO groups (
        name,
        description,
        owner_id
    ) VALUES (
        'Demo Group',
        'A group for testing purposes',
        user_id_1
    ) RETURNING id INTO group_id;

    -- Create platform
    INSERT INTO subscription_platforms (
        name,
        description,
        max_members,
        requirements_text
    ) VALUES (
        'Demo Netflix',
        'Netflix demo platform',
        5,
        'Demo requirements'
    ) RETURNING id INTO platform_id;

    -- Create group subscription
    INSERT INTO group_subs (
        group_id,
        platform_id,
        status,
        slots_total,
        slots_available,
        price_per_slot
    ) VALUES (
        group_id,
        platform_id,
        'active',
        5,
        3,
        25.00
    ) RETURNING id INTO group_sub_id;

    -- Create access instructions
    INSERT INTO access_instructions (
        group_sub_id,
        encrypted_data,
        data_key_enc,
        encryption_key_id,
        iv,
        encryption_version
    ) VALUES (
        group_sub_id,
        'demo_encrypted_data',
        'demo_encrypted_key',
        master_key_id,
        'demo_iv',
        '1.0'
    );
END $$;