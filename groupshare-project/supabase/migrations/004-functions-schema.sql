-- Functions for GroupShare
-- This script creates utility functions for the application

-- Create a function to get the current authenticated user ID
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM user_profiles WHERE external_auth_id = auth.uid()::text);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF group_id IS NULL OR user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = $1 AND user_id = $2 AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a group admin
CREATE OR REPLACE FUNCTION is_group_admin(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF group_id IS NULL OR user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is a group owner
CREATE OR REPLACE FUNCTION is_group_owner(group_id UUID, user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF group_id IS NULL OR user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM groups 
    WHERE id = $1 AND owner_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate a secure token
CREATE OR REPLACE FUNCTION generate_secure_token() RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to calculate ratings for a user
CREATE OR REPLACE FUNCTION calculate_user_ratings(user_id UUID) RETURNS VOID AS $$
DECLARE
  avg_rating FLOAT;
  rating_count INTEGER;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be NULL';
  END IF;

  SELECT 
    AVG((access_quality + communication + reliability) / 3.0),
    COUNT(*)
  INTO
    avg_rating,
    rating_count
  FROM ratings
  WHERE rated_id = user_id;
  
  UPDATE user_profiles
  SET 
    rating_avg = COALESCE(avg_rating, 0),
    rating_count = COALESCE(rating_count, 0)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_action_type TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_status TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_action_type IS NULL OR p_resource_type IS NULL OR p_resource_id IS NULL OR p_status IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be NULL';
    END IF;
    
    INSERT INTO security_logs (
        user_id,
        action_type,
        resource_type,
        resource_id,
        status,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_user_id,
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_status,
        p_ip_address,
        p_user_agent,
        p_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        -- W przypadku błędu nie logujemy do security_logs, bo to mogłoby prowadzić do rekurencji
        RAISE NOTICE 'Error in log_security_event: %', SQLERRM;
        RETURN NULL; -- Zwracamy NULL zamiast rzucać wyjątek, aby nie przerywać głównej operacji
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to track device fingerprints
CREATE OR REPLACE FUNCTION track_device_fingerprint(
    p_user_id UUID,
    p_fingerprint TEXT
) RETURNS UUID AS $$
DECLARE
    device_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_user_id IS NULL OR p_fingerprint IS NULL OR LENGTH(p_fingerprint) = 0 THEN
        RAISE EXCEPTION 'User ID and fingerprint are required and cannot be empty';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Check if fingerprint already exists for this user
        SELECT id INTO device_id
        FROM device_fingerprints
        WHERE user_id = p_user_id AND fingerprint = p_fingerprint;
        
        IF device_id IS NULL THEN
            -- Insert new fingerprint
            INSERT INTO device_fingerprints (
                user_id,
                fingerprint,
                first_seen_at,
                last_seen_at
            ) VALUES (
                p_user_id,
                p_fingerprint,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            ) RETURNING id INTO device_id;
        ELSE
            -- Update existing fingerprint
            UPDATE device_fingerprints
            SET 
                last_seen_at = CURRENT_TIMESTAMP,
                counter = counter + 1
            WHERE id = device_id;
        END IF;
        
        RETURN device_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_user_id,
                'device_fingerprint_tracking',
                'device',
                p_fingerprint,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create a transaction
CREATE OR REPLACE FUNCTION create_transaction(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_group_sub_id UUID,
    p_purchase_record_id UUID,
    p_amount FLOAT,
    p_platform_fee_percent FLOAT,
    p_payment_method TEXT,
    p_payment_provider TEXT,
    p_payment_id TEXT
) RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    platform_fee FLOAT;
    seller_amount FLOAT;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_buyer_id IS NULL OR p_seller_id IS NULL OR p_group_sub_id IS NULL OR p_purchase_record_id IS NULL THEN
        RAISE EXCEPTION 'Required IDs cannot be NULL';
    END IF;
    
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;
    
    IF p_platform_fee_percent < 0 OR p_platform_fee_percent > 1 THEN
        RAISE EXCEPTION 'Platform fee percentage must be between 0 and 1';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Sprawdzenie czy rekord zakupu istnieje
        IF NOT EXISTS (SELECT 1 FROM purchase_records WHERE id = p_purchase_record_id) THEN
            RAISE EXCEPTION 'Purchase record does not exist';
        END IF;
        
        -- Obliczenie opłat
        platform_fee := p_amount * p_platform_fee_percent;
        seller_amount := p_amount - platform_fee;
        
        -- Utworzenie transakcji
        INSERT INTO transactions (
            buyer_id,
            seller_id,
            group_sub_id,
            purchase_record_id,
            amount,
            platform_fee,
            seller_amount,
            payment_method,
            payment_provider,
            payment_id,
            status
        ) VALUES (
            p_buyer_id,
            p_seller_id,
            p_group_sub_id,
            p_purchase_record_id,
            p_amount,
            platform_fee,
            seller_amount,
            p_payment_method,
            p_payment_provider,
            p_payment_id,
            'pending'
        ) RETURNING id INTO transaction_id;
        
        RETURN transaction_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_buyer_id,
                'transaction_creation',
                'purchase_record',
                p_purchase_record_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to complete a transaction with automatic access provision
CREATE OR REPLACE FUNCTION complete_transaction(
    p_transaction_id UUID,
    p_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_purchase_record_id UUID;
    v_group_sub_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Transaction ID cannot be NULL';
    END IF;
    
    IF p_status IS NULL OR p_status NOT IN ('completed', 'failed', 'refunded') THEN
        RAISE EXCEPTION 'Invalid status. Must be one of: completed, failed, refunded';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Get purchase record ID and group_sub_id
        SELECT t.purchase_record_id, pr.group_sub_id
        INTO v_purchase_record_id, v_group_sub_id
        FROM transactions t
        JOIN purchase_records pr ON t.purchase_record_id = pr.id
        WHERE t.id = p_transaction_id;
        
        IF v_purchase_record_id IS NULL THEN
            RAISE EXCEPTION 'Transaction not found or purchase record reference is missing';
        END IF;
        
        -- Update transaction
        UPDATE transactions
        SET 
            status = p_status,
            completed_at = CASE WHEN p_status = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_transaction_id;
        
        -- If completed, update purchase record with access automatically provided
        IF p_status = 'completed' THEN
            UPDATE purchase_records
            SET 
                status = 'completed',
                access_provided = TRUE,
                access_provided_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_purchase_record_id;
        ELSIF p_status = 'failed' THEN
            UPDATE purchase_records
            SET 
                status = 'failed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_purchase_record_id;
        ELSIF p_status = 'refunded' THEN
            UPDATE purchase_records
            SET 
                status = 'refunded',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_purchase_record_id;
        END IF;
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                NULL, -- Nie znamy user_id w tym kontekście
                'transaction_completion',
                'transaction',
                p_transaction_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if slots are available in a group subscription
CREATE OR REPLACE FUNCTION check_slots_available(
    p_group_sub_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    available_slots INTEGER;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_group_sub_id IS NULL THEN
        RAISE EXCEPTION 'Group subscription ID cannot be NULL';
    END IF;
    
    -- Pobranie liczby dostępnych slotów z blokadą wiersza
    SELECT slots_available INTO available_slots
    FROM group_subs
    WHERE id = p_group_sub_id
    FOR SHARE; -- Używamy FOR SHARE, aby inne transakcje mogły czytać, ale nie aktualizować
    
    IF available_slots IS NULL THEN
        RAISE EXCEPTION 'Group subscription not found';
    END IF;
    
    RETURN available_slots > 0;
EXCEPTION
    WHEN OTHERS THEN
        -- Logowanie błędu
        PERFORM log_security_event(
            NULL,
            'check_slots_available',
            'group_sub',
            p_group_sub_id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RETURN FALSE; -- Bezpieczny fallback
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update available slots when a purchase is completed
CREATE OR REPLACE FUNCTION update_group_sub_slots() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
        -- Zmniejszenie dostępnych slotów z blokadą wiersza
        UPDATE group_subs
        SET 
            slots_available = slots_available - 1,
            status = CASE 
                WHEN slots_available - 1 <= 0 THEN 'full'
                ELSE status
            END
        WHERE id = NEW.group_sub_id;
        
        -- Dodatkowe sprawdzenie, czy nie przekroczono limitu slotów
        IF (SELECT slots_available FROM group_subs WHERE id = NEW.group_sub_id) < 0 THEN
            RAISE EXCEPTION 'No available slots left in this subscription';
        END IF;
    ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        -- Zwiększenie dostępnych slotów jeśli zakup jest anulowany/zwrócony
        UPDATE group_subs
        SET 
            slots_available = slots_available + 1,
            status = CASE 
                WHEN status = 'full' AND slots_available + 1 > 0 THEN 'active'
                ELSE status
            END
        WHERE id = NEW.group_sub_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Logowanie błędu
        PERFORM log_security_event(
            NULL,
            'update_group_sub_slots',
            'purchase_record',
            NEW.id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update available slots
CREATE TRIGGER update_slots_on_purchase_status_change
AFTER UPDATE OF status ON purchase_records
FOR EACH ROW
EXECUTE FUNCTION update_group_sub_slots();

-- Create a function to check if a user can access a subscription
CREATE OR REPLACE FUNCTION can_access_subscription(
    p_user_id UUID,
    p_group_sub_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Sprawdzenie parametrów wejściowych
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be NULL';
    END IF;
    
    IF p_group_sub_id IS NULL THEN
        RAISE EXCEPTION 'Group subscription ID cannot be NULL';
    END IF;
    
    -- Sprawdzenie czy użytkownik ma dostęp do subskrypcji
    RETURN EXISTS (
        SELECT 1 
        FROM purchase_records 
        WHERE user_id = p_user_id 
        AND group_sub_id = p_group_sub_id 
        AND status = 'completed'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Logowanie błędu
        PERFORM log_security_event(
            p_user_id,
            'subscription_access_check',
            'group_sub',
            p_group_sub_id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RETURN FALSE; -- Bezpieczny fallback
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to reserve subscription slot
CREATE OR REPLACE FUNCTION reserve_subscription_slot(
    p_group_sub_id UUID,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    slots_available INTEGER;
    purchase_record_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_group_sub_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Group subscription ID and user ID cannot be NULL';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Blokowanie wiersza subskrypcji podczas całej operacji
        SELECT slots_available INTO slots_available
        FROM group_subs
        WHERE id = p_group_sub_id
        FOR UPDATE;
        
        IF slots_available IS NULL THEN
            RAISE EXCEPTION 'Group subscription not found';
        END IF;
        
        IF slots_available <= 0 THEN
            RETURN NULL; -- No slots available
        END IF;
        
        -- Sprawdzenie czy użytkownik już ma aktywną subskrypcję
        IF EXISTS (
            SELECT 1 
            FROM purchase_records 
            WHERE user_id = p_user_id 
            AND group_sub_id = p_group_sub_id 
            AND status IN ('pending_payment', 'payment_processing', 'completed')
        ) THEN
            RAISE EXCEPTION 'User already has an active or pending subscription';
        END IF;
        
        -- Utworzenie rekordu zakupu
        INSERT INTO purchase_records (
            user_id,
            group_sub_id,
            status
        ) VALUES (
            p_user_id,
            p_group_sub_id,
            'pending_payment'
        ) RETURNING id INTO purchase_record_id;
        
        -- Tymczasowe zmniejszenie dostępnych slotów
        UPDATE group_subs
        SET 
            slots_available = slots_available - 1,
            status = CASE 
                WHEN slots_available - 1 <= 0 THEN 'full'
                ELSE status
            END
        WHERE id = p_group_sub_id;
        
        -- Dodanie wpisu w logu bezpieczeństwa
        PERFORM log_security_event(
            p_user_id,
            'slot_reservation',
            'group_sub',
            p_group_sub_id::TEXT,
            'success',
            NULL,
            NULL,
            jsonb_build_object(
                'purchase_record_id', purchase_record_id
            )
        );
        
        RETURN purchase_record_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_user_id,
                'slot_reservation',
                'group_sub',
                p_group_sub_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle access provision
CREATE OR REPLACE FUNCTION handle_access_provision() RETURNS TRIGGER AS $$
DECLARE
    access_instruction_id UUID;
BEGIN
    -- Only proceed if status changes to 'completed' and access is not yet provided
    IF NEW.status = 'completed' AND (OLD.status <> 'completed' OR OLD.status IS NULL) AND NOT NEW.access_provided THEN
        -- Mark access as provided
        UPDATE purchase_records
        SET 
            access_provided = TRUE,
            access_provided_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
        
        -- Log the event
        PERFORM log_security_event(
            NEW.user_id,
            'access_provided',
            'purchase_record',
            NEW.id::TEXT,
            'success',
            NULL,
            NULL,
            jsonb_build_object('group_sub_id', NEW.group_sub_id)
        );
        
        -- Create notification for the user
        PERFORM create_notification(
            NEW.user_id,
            'access',
            'Access granted',
            'You now have access to your subscription. Check your account for access details.',
            'purchase_record',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors
        PERFORM log_security_event(
            NEW.user_id,
            'access_provision_error',
            'purchase_record',
            NEW.id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RETURN NEW; -- Don't throw an exception to avoid transaction failures
END;
$$ LANGUAGE plpgsql;

-- Create trigger for access provision
CREATE TRIGGER handle_access_provision_on_purchase_completion
AFTER UPDATE OF status ON purchase_records
FOR EACH ROW
EXECUTE FUNCTION handle_access_provision();

-- Function to get access instructions
CREATE OR REPLACE FUNCTION get_access_instructions(
    p_purchase_record_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_group_sub_id UUID;
    v_user_id UUID;
    v_status TEXT;
    v_access_provided BOOLEAN;
    v_encrypted_data TEXT;
    v_data_key_enc TEXT;
    v_iv TEXT;
    v_encryption_version TEXT;
BEGIN
    -- Get purchase record details
    SELECT 
        pr.group_sub_id, 
        pr.user_id, 
        pr.status, 
        pr.access_provided 
    INTO 
        v_group_sub_id, 
        v_user_id, 
        v_status, 
        v_access_provided
    FROM 
        purchase_records pr
    WHERE 
        pr.id = p_purchase_record_id;
    
    -- Verify access is allowed
    IF v_status <> 'completed' OR NOT v_access_provided THEN
        RETURN 'Access not available. Status: ' || v_status || ', Access provided: ' || v_access_provided;
    END IF;
    
    -- Get encrypted access instructions
    SELECT 
        ai.encrypted_data,
        ai.data_key_enc,
        ai.iv,
        ai.encryption_version
    INTO 
        v_encrypted_data,
        v_data_key_enc,
        v_iv,
        v_encryption_version
    FROM 
        access_instructions ai
    WHERE 
        ai.group_sub_id = v_group_sub_id;
    
    -- In real implementation, here we would decrypt the data using the user's key
    -- For this demo, we'll just return a message that data is available
    
    -- Log the access attempt
    PERFORM log_security_event(
        v_user_id,
        'access_instructions_fetch',
        'purchase_record',
        p_purchase_record_id::TEXT,
        'success',
        NULL,
        NULL,
        jsonb_build_object('group_sub_id', v_group_sub_id)
    );
    
    -- Return a placeholder for the instructions
    RETURN 'Access instructions available. In production, decrypted content would be returned here.';
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors
        PERFORM log_security_event(
            v_user_id,
            'access_instructions_error',
            'purchase_record',
            p_purchase_record_id::TEXT,
            'error',
            NULL,
            NULL,
            jsonb_build_object('error', SQLERRM)
        );
        RETURN 'Error fetching access instructions: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for processing payments in a single step
CREATE OR REPLACE FUNCTION process_payment(
    p_user_id UUID,
    p_group_sub_id UUID,
    p_payment_method TEXT,
    p_payment_provider TEXT,
    p_payment_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_purchase_record_id UUID;
    v_transaction_id UUID;
    v_seller_id UUID;
    v_amount FLOAT;
    v_platform_fee_percent FLOAT := 0.05; -- Default fee
    v_result JSONB;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_user_id IS NULL OR p_group_sub_id IS NULL THEN
        RAISE EXCEPTION 'User ID and group subscription ID cannot be NULL';
    END IF;
    
    -- Rozpoczęcie transakcji
    BEGIN
        -- Get subscription info
        SELECT 
            gs.price_per_slot,
            u.id
        INTO 
            v_amount,
            v_seller_id
        FROM 
            group_subs gs
            JOIN groups g ON gs.group_id = g.id
            JOIN user_profiles u ON g.owner_id = u.id
        WHERE 
            gs.id = p_group_sub_id;
        
        -- Reserve a slot first
        v_purchase_record_id := reserve_subscription_slot(p_group_sub_id, p_user_id);
        
        IF v_purchase_record_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message', 'Failed to reserve subscription slot. No slots available or other error.'
            );
        END IF;
        
        -- Update purchase record to payment_processing
        UPDATE purchase_records
        SET status = 'payment_processing'
        WHERE id = v_purchase_record_id;
        
        -- Create transaction
        v_transaction_id := create_transaction(
            p_user_id,
            v_seller_id,
            p_group_sub_id,
            v_purchase_record_id,
            v_amount,
            v_platform_fee_percent,
            p_payment_method,
            p_payment_provider,
            p_payment_id
        );
        
        -- Complete the transaction
        PERFORM complete_transaction(v_transaction_id, 'completed');
        
        -- Return result
        v_result := jsonb_build_object(
            'success', TRUE,
            'purchase_record_id', v_purchase_record_id,
            'transaction_id', v_transaction_id,
            'message', 'Payment successful. Access granted.'
        );
        
        RETURN v_result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Logowanie błędu
            PERFORM log_security_event(
                p_user_id,
                'payment_processing',
                'group_sub',
                p_group_sub_id::TEXT,
                'error',
                NULL,
                NULL,
                jsonb_build_object('error', SQLERRM)
            );
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Walidacja parametrów wejściowych
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be NULL';
    END IF;
    
    IF p_type IS NULL OR p_title IS NULL OR p_content IS NULL THEN
        RAISE EXCEPTION 'Notification type, title, and content cannot be NULL';
    END IF;
    
    -- Wstawianie powiadomienia
    INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        related_entity_type,
        related_entity_id
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_content,
        p_related_entity_type,
        p_related_entity_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in create_notification: %', SQLERRM;
        RETURN NULL; -- Zwracamy NULL zamiast rzucać wyjątek, aby nie przerywać głównej operacji
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for notifying when payment is completed
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    -- Notify buyer when payment is completed
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.buyer_id,
        'payment',
        'Payment completed',
        'Your payment has been processed successfully',
        'transaction',
        NEW.id
      );
      
      -- Notify seller
      PERFORM create_notification(
        NEW.seller_id,
        'payment',
        'Payment received',
        'You have received a payment',
        'transaction',
        NEW.id
      );
    
    -- Notify buyer when payment fails
    ELSIF NEW.status = 'failed' THEN
      PERFORM create_notification(
        NEW.buyer_id,
        'payment',
        'Payment failed',
        'Your payment could not be processed',
        'transaction',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in notify_payment_status_change: %', SQLERRM;
    RETURN NEW; -- Zapewniamy, że błąd w powiadomieniach nie blokuje głównej operacji
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_payment_status_change
AFTER UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_payment_status_change();