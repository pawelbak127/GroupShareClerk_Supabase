-- Extended features for GroupShare MVP
-- This script adds functions and triggers for additional functionality

-- Create a function to create a message thread
CREATE OR REPLACE FUNCTION create_message_thread(
    p_title TEXT,
    p_participants UUID[],
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    thread_id UUID;
    participant UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_participants IS NULL OR array_length(p_participants, 1) IS NULL THEN
        RAISE EXCEPTION 'Participants array cannot be NULL or empty';
    END IF;
    
    IF p_title IS NULL THEN
        p_title := 'New conversation';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Create thread
        INSERT INTO message_threads (
            title,
            related_entity_type,
            related_entity_id
        ) VALUES (
            p_title,
            p_related_entity_type,
            p_related_entity_id
        ) RETURNING id INTO thread_id;
        
        -- Add participants
        FOREACH participant IN ARRAY p_participants
        LOOP
            IF participant IS NULL THEN
                CONTINUE; -- Pomijamy NULL uczestników
            END IF;
            
            INSERT INTO message_thread_participants (
                thread_id,
                user_id
            ) VALUES (
                thread_id,
                participant
            );
        END LOOP;
        
        RETURN thread_id;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_content TEXT,
    p_thread_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    message_id UUID;
    thread_id_local UUID := p_thread_id;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_sender_id IS NULL OR p_receiver_id IS NULL THEN
        RAISE EXCEPTION 'Sender ID and receiver ID cannot be NULL';
    END IF;
    
    IF p_content IS NULL OR LENGTH(p_content) = 0 THEN
        RAISE EXCEPTION 'Message content cannot be NULL or empty';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- If no thread_id is provided, check if a direct thread exists between sender and receiver
        IF thread_id_local IS NULL THEN
            SELECT mt.id INTO thread_id_local
            FROM message_threads mt
            INNER JOIN message_thread_participants mtp1 ON mt.id = mtp1.thread_id
            INNER JOIN message_thread_participants mtp2 ON mt.id = mtp2.thread_id
            WHERE mtp1.user_id = p_sender_id
              AND mtp2.user_id = p_receiver_id
              AND mt.related_entity_type IS NULL
              AND (SELECT COUNT(*) FROM message_thread_participants WHERE thread_id = mt.id) = 2
            LIMIT 1;
            
            -- If no thread exists, create a new one
            IF thread_id_local IS NULL THEN
                thread_id_local := create_message_thread(
                    'Direct message',
                    ARRAY[p_sender_id, p_receiver_id]::UUID[]
                );
            END IF;
        END IF;
        
        -- Insert message
        INSERT INTO messages (
            sender_id,
            receiver_id,
            content,
            thread_id
        ) VALUES (
            p_sender_id,
            p_receiver_id,
            p_content,
            thread_id_local
        ) RETURNING id INTO message_id;
        
        -- Update thread's updated_at
        UPDATE message_threads
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = thread_id_local;
        
        -- Create notification for receiver
        PERFORM create_notification(
            p_receiver_id,
            'message',
            'New message',
            substring(p_content from 1 for 100) || CASE WHEN length(p_content) > 100 THEN '...' ELSE '' END,
            'message',
            message_id
        );
        
        RETURN message_id;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create group invitation
CREATE OR REPLACE FUNCTION create_group_invitation(
    p_group_id UUID,
    p_email TEXT,
    p_invited_by UUID,
    p_role TEXT DEFAULT 'member',
    p_expires_in_days INTEGER DEFAULT 7
) RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    user_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_group_id IS NULL OR p_email IS NULL OR p_invited_by IS NULL THEN
        RAISE EXCEPTION 'Group ID, email, and invited_by user ID cannot be NULL';
    END IF;
    
    IF p_role IS NULL OR p_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Role must be either "admin" or "member"';
    END IF;
    
    IF p_expires_in_days IS NULL OR p_expires_in_days <= 0 THEN
        p_expires_in_days := 7; -- Domyślny czas wygaśnięcia
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Generate unique token
        invitation_token := generate_secure_token();
        
        -- Create invitation
        INSERT INTO group_invitations (
            group_id,
            email,
            invited_by,
            role,
            invitation_token,
            status,
            expires_at
        ) VALUES (
            p_group_id,
            p_email,
            p_invited_by,
            p_role,
            invitation_token,
            'pending',
            CURRENT_TIMESTAMP + (p_expires_in_days || ' days')::INTERVAL
        ) RETURNING id INTO invitation_id;
        
        -- Check if user with this email exists
        SELECT id INTO user_id
        FROM user_profiles
        WHERE email = p_email;
        
        -- If user exists, create notification
        IF user_id IS NOT NULL THEN
            PERFORM create_notification(
                user_id,
                'invitation',
                'Group invitation',
                'You have been invited to join a group: ' || (SELECT name FROM groups WHERE id = p_group_id),
                'group',
                p_group_id
            );
        END IF;
        
        RETURN invitation_id;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_group_invitation(
    p_invitation_token TEXT,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    invitation_record group_invitations%ROWTYPE;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_invitation_token IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invitation token and user ID cannot be NULL';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Get invitation
        SELECT * INTO invitation_record
        FROM group_invitations
        WHERE invitation_token = p_invitation_token
        FOR UPDATE; -- Blokujemy wiersz na czas transakcji
        
        -- Check if invitation exists
        IF invitation_record IS NULL THEN
            RAISE EXCEPTION 'Invalid invitation token';
        END IF;
        
        -- Check if invitation is expired
        IF invitation_record.expires_at < CURRENT_TIMESTAMP THEN
            UPDATE group_invitations
            SET status = 'expired'
            WHERE id = invitation_record.id;
            
            RAISE EXCEPTION 'Invitation has expired';
        END IF;
        
        -- Check if invitation is still pending
        IF invitation_record.status <> 'pending' THEN
            RAISE EXCEPTION 'Invitation has already been % ', invitation_record.status;
        END IF;
        
        -- Update invitation status
        UPDATE group_invitations
        SET 
            status = 'accepted',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = invitation_record.id;
        
        -- Add user to group
        INSERT INTO group_members (
            group_id,
            user_id,
            role,
            status,
            invited_by,
            joined_at
        ) VALUES (
            invitation_record.group_id,
            p_user_id,
            invitation_record.role,
            'active',
            invitation_record.invited_by,
            CURRENT_TIMESTAMP
        );
        
        -- Notify the inviter
        PERFORM create_notification(
            invitation_record.invited_by,
            'invitation_accepted',
            'Invitation accepted',
            (SELECT display_name FROM user_profiles WHERE id = p_user_id) || ' has accepted your invitation to join ' || 
            (SELECT name FROM groups WHERE id = invitation_record.group_id),
            'group',
            invitation_record.group_id
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a dispute
CREATE OR REPLACE FUNCTION create_dispute(
    p_reporter_id UUID,
    p_reported_entity_type TEXT,
    p_reported_entity_id UUID,
    p_dispute_type TEXT,
    p_description TEXT,
    p_transaction_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    dispute_id UUID;
    admin_ids UUID[];
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_reporter_id IS NULL OR p_reported_entity_type IS NULL OR p_reported_entity_id IS NULL THEN
        RAISE EXCEPTION 'Reporter ID, reported entity type, and reported entity ID cannot be NULL';
    END IF;
    
    IF p_dispute_type IS NULL OR p_description IS NULL THEN
        RAISE EXCEPTION 'Dispute type and description cannot be NULL';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Create dispute
        INSERT INTO disputes (
            reporter_id,
            reported_entity_type,
            reported_entity_id,
            transaction_id,
            dispute_type,
            description,
            status
        ) VALUES (
            p_reporter_id,
            p_reported_entity_type,
            p_reported_entity_id,
            p_transaction_id,
            p_dispute_type,
            p_description,
            'open'
        ) RETURNING id INTO dispute_id;
        
        -- Notify admins (in real implementation, you'd notify system admins)
        -- For MVP, we'll notify group admins if dispute is about a group or subscription
        IF p_reported_entity_type = 'group' THEN
            SELECT array_agg(user_id) INTO admin_ids
            FROM group_members
            WHERE group_id = p_reported_entity_id AND role = 'admin';
        ELSIF p_reported_entity_type = 'subscription' THEN
            SELECT array_agg(gm.user_id) INTO admin_ids
            FROM group_members gm
            JOIN group_subs gs ON gm.group_id = gs.group_id
            WHERE gs.id = p_reported_entity_id AND gm.role = 'admin';
        END IF;
        
        -- If we have admins to notify
        IF admin_ids IS NOT NULL THEN
            FOR i IN 1..array_length(admin_ids, 1)
            LOOP
                PERFORM create_notification(
                    admin_ids[i],
                    'dispute',
                    'New dispute reported',
                    'A new dispute has been reported: ' || p_dispute_type,
                    'dispute',
                    dispute_id
                );
            END LOOP;
        END IF;
        
        RETURN dispute_id;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add comment to dispute
CREATE OR REPLACE FUNCTION add_dispute_comment(
    p_dispute_id UUID,
    p_user_id UUID,
    p_comment TEXT,
    p_is_internal BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    comment_id UUID;
    dispute_record disputes%ROWTYPE;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_dispute_id IS NULL OR p_user_id IS NULL OR p_comment IS NULL THEN
        RAISE EXCEPTION 'Dispute ID, user ID, and comment cannot be NULL';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Get dispute
        SELECT * INTO dispute_record
        FROM disputes
        WHERE id = p_dispute_id;
        
        -- Check if dispute exists
        IF dispute_record IS NULL THEN
            RAISE EXCEPTION 'Dispute not found';
        END IF;
        
        -- Add comment
        INSERT INTO dispute_comments (
            dispute_id,
            user_id,
            comment,
            is_internal
        ) VALUES (
            p_dispute_id,
            p_user_id,
            p_comment,
            p_is_internal
        ) RETURNING id INTO comment_id;
        
        -- Notify reporter if comment is from someone else
        IF p_user_id <> dispute_record.reporter_id AND NOT p_is_internal THEN
            PERFORM create_notification(
                dispute_record.reporter_id,
                'dispute_comment',
                'New comment on your dispute',
                'Someone has commented on your dispute',
                'dispute',
                p_dispute_id
            );
        END IF;
        
        RETURN comment_id;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve dispute
CREATE OR REPLACE FUNCTION resolve_dispute(
    p_dispute_id UUID,
    p_resolver_id UUID,
    p_status TEXT,
    p_resolution_note TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    dispute_record disputes%ROWTYPE;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_dispute_id IS NULL OR p_resolver_id IS NULL OR p_status IS NULL THEN
        RAISE EXCEPTION 'Dispute ID, resolver ID, and status cannot be NULL';
    END IF;
    
    IF p_status NOT IN ('investigating', 'resolved', 'rejected') THEN
        RAISE EXCEPTION 'Status must be one of: investigating, resolved, rejected';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Get dispute
        SELECT * INTO dispute_record
        FROM disputes
        WHERE id = p_dispute_id
        FOR UPDATE;
        
        -- Check if dispute exists
        IF dispute_record IS NULL THEN
            RAISE EXCEPTION 'Dispute not found';
        END IF;
        
        -- Update dispute
        UPDATE disputes
        SET 
            status = p_status,
            resolution_note = p_resolution_note,
            resolved_by = p_resolver_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_dispute_id;
        
        -- Notify reporter
        PERFORM create_notification(
            dispute_record.reporter_id,
            'dispute_resolved',
            'Your dispute has been resolved',
            'Your dispute has been marked as ' || p_status,
            'dispute',
            p_dispute_id
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity(
    p_user_id UUID,
    p_action TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    suspicious BOOLEAN := FALSE;
    recent_activities INTEGER;
    different_ips INTEGER;
    usual_ip TEXT;
BEGIN
    -- Walidacja danych wejściowych
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Sprawdzenie liczby aktywności w ostatniej godzinie
    SELECT COUNT(*) INTO recent_activities
    FROM security_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour';
      
    IF recent_activities > 100 THEN -- Próg do dostosowania
        suspicious := TRUE;
    END IF;
    
    -- Sprawdzenie różnych adresów IP w krótkim czasie
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM security_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '24 hours';
      
    -- Pobranie najczęściej używanego IP
    SELECT ip_address INTO usual_ip
    FROM security_logs
    WHERE user_id = p_user_id
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Jeśli jest wiele różnych IP i obecne IP nie jest zwykle używanym
    IF different_ips > 5 AND p_ip_address <> usual_ip THEN
        suspicious := TRUE;
    END IF;
    
    -- Jeśli aktywność jest podejrzana, zapisz zdarzenie
    IF suspicious THEN
        PERFORM log_security_event(
            p_user_id,
            'suspicious_activity',
            'user',
            p_user_id::text,
            'warning',
            p_ip_address,
            p_user_agent,
            jsonb_build_object(
                'action', p_action,
                'recent_activities', recent_activities,
                'different_ips', different_ips
            )
        );
    END IF;
    
    RETURN suspicious;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in check_suspicious_activity: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for notifying purchase record status changes
CREATE OR REPLACE FUNCTION notify_purchase_record_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    -- Notify owner when status changes to 'payment_processing'
    IF NEW.status = 'payment_processing' THEN
      PERFORM create_notification(
        NEW.user_id,
        'purchase',
        'Payment processing',
        'Your payment is being processed',
        'purchase_record',
        NEW.id
      );
    
    -- Notify owner when status changes to 'completed'
    ELSIF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'purchase',
        'Purchase completed',
        'Your purchase has been completed successfully',
        'purchase_record',
        NEW.id
      );
    
    -- Notify owner when status changes to 'failed'
    ELSIF NEW.status = 'failed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'purchase',
        'Purchase failed',
        'Your purchase could not be completed',
        'purchase_record',
        NEW.id
      );
    END IF;
    
    -- Notify subscription owner about new purchases
    IF (OLD.status IS NULL OR OLD.status <> 'pending_payment') AND NEW.status = 'pending_payment' THEN
      PERFORM create_notification(
        (SELECT owner_id FROM groups WHERE id = (SELECT group_id FROM group_subs WHERE id = NEW.group_sub_id)),
        'purchase',
        'New subscription purchase',
        'Someone has purchased your subscription',
        'purchase_record',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in notify_purchase_record_status_change: %', SQLERRM;
    RETURN NEW; -- Zapewniamy, że błąd w powiadomieniach nie blokuje głównej operacji
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_purchase_record_status_change
AFTER UPDATE OF status ON purchase_records
FOR EACH ROW
EXECUTE FUNCTION notify_purchase_record_status_change();