-- API Helper Functions for GroupShare
-- This script adds API-specific helper functions for the application

-- Create a function to safely get the current user's profile
CREATE OR REPLACE FUNCTION public.api_get_current_user() RETURNS JSONB AS $$
DECLARE
  clerk_id TEXT;
  profile_record RECORD;
  result JSONB;
BEGIN
  -- Get the current Clerk user ID
  clerk_id := auth.clerk_user_id();
  
  -- Log the attempt
  INSERT INTO security_logs (
    action_type,
    resource_type,
    resource_id,
    status,
    ip_address,
    user_agent,
    details
  ) VALUES (
    'api_call',
    'user_profile',
    'current_user',
    CASE WHEN clerk_id IS NULL THEN 'error' ELSE 'success' END,
    nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::text,
    nullif(current_setting('request.headers', true)::json->>'user-agent', '')::text,
    jsonb_build_object(
      'clerk_id', clerk_id,
      'authenticated', clerk_id IS NOT NULL,
      'jwt_claims', auth.get_jwt_claims()
    )
  );
  
  -- If not authenticated, return error
  IF clerk_id IS NULL THEN
    -- Check if we're in development mode
    IF is_development_mode() THEN
      -- In development mode, return the first test user
      SELECT * INTO profile_record FROM user_profiles
      WHERE external_auth_id LIKE 'dev%' OR external_auth_id LIKE 'mock%'
      ORDER BY created_at LIMIT 1;
      
      IF profile_record IS NULL THEN
        -- Create a test user if none exists
        SELECT public.create_dev_test_user() INTO result;
        
        -- Get the newly created user
        SELECT * INTO profile_record FROM user_profiles
        WHERE external_auth_id = 'dev_test_user_id';
      END IF;
      
      RETURN jsonb_build_object(
        'id', profile_record.id,
        'external_auth_id', profile_record.external_auth_id,
        'display_name', profile_record.display_name,
        'email', profile_record.email,
        'phone_number', profile_record.phone_number,
        'profile_type', profile_record.profile_type,
        'verification_level', profile_record.verification_level,
        'bio', profile_record.bio,
        'avatar_url', profile_record.avatar_url,
        'preferences', profile_record.preferences,
        'rating_avg', profile_record.rating_avg,
        'rating_count', profile_record.rating_count,
        'is_premium', profile_record.is_premium,
        'subscription_tier', profile_record.subscription_tier,
        'created_at', profile_record.created_at,
        'dev_mode', true
      );
    END IF;
    
    RETURN jsonb_build_object(
      'error', 'Not authenticated',
      'status', 401,
      'message', 'You must be logged in to access this resource'
    );
  END IF;
  
  -- Get the user profile
  SELECT * INTO profile_record FROM user_profiles 
  WHERE external_auth_id = clerk_id;
  
  -- If profile doesn't exist, try to create it
  IF profile_record IS NULL THEN
    -- Try to get email from JWT claims
    DECLARE
      user_email TEXT;
      user_name TEXT;
      created_profile_id UUID;
    BEGIN
      -- Extract user info from JWT claims
      BEGIN
        user_email := nullif(current_setting('request.jwt.claims', true)::json->>'email', '')::text;
      EXCEPTION
        WHEN others THEN
          user_email := 'no-email@example.com';
      END;
      
      -- Try to get name from JWT claims
      BEGIN
        user_name := nullif(current_setting('request.jwt.claims', true)::json->>'name', '')::text;
        IF user_name IS NULL THEN
          user_name := 'User ' || substring(clerk_id, 1, 8);
        END IF;
      EXCEPTION
        WHEN others THEN
          user_name := 'User ' || substring(clerk_id, 1, 8);
      END;
      
      -- Create new profile
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
      ) RETURNING id INTO created_profile_id;
      
      -- Get the newly created profile
      SELECT * INTO profile_record FROM user_profiles 
      WHERE id = created_profile_id;
      
      -- Log the profile creation
      INSERT INTO security_logs (
        user_id,
        action_type,
        resource_type,
        resource_id,
        status,
        details
      ) VALUES (
        created_profile_id,
        'user_creation',
        'user_profile',
        created_profile_id::text,
        'success',
        jsonb_build_object(
          'method', 'api_get_current_user',
          'external_auth_id', clerk_id,
          'email', user_email
        )
      );
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
          'api_error',
          'error',
          jsonb_build_object(
            'error', SQLERRM,
            'external_auth_id', clerk_id
          )
        );
        
        RETURN jsonb_build_object(
          'error', 'Failed to create user profile',
          'status', 500,
          'message', 'An error occurred while creating your profile. Please try again later.'
        );
    END;
  END IF;
  
  -- Return the user profile
  RETURN jsonb_build_object(
    'id', profile_record.id,
    'external_auth_id', profile_record.external_auth_id,
    'display_name', profile_record.display_name,
    'email', profile_record.email,
    'phone_number', profile_record.phone_number,
    'profile_type', profile_record.profile_type,
    'verification_level', profile_record.verification_level,
    'bio', profile_record.bio,
    'avatar_url', profile_record.avatar_url,
    'preferences', profile_record.preferences,
    'rating_avg', profile_record.rating_avg,
    'rating_count', profile_record.rating_count,
    'is_premium', profile_record.is_premium,
    'subscription_tier', profile_record.subscription_tier,
    'created_at', profile_record.created_at
  );
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
      'api_call',
      'user_profile',
      'error',
      'error',
      jsonb_build_object(
        'error', SQLERRM,
        'clerk_id', clerk_id
      )
    );
    
    RETURN jsonb_build_object(
      'error', 'Internal server error',
      'status', 500,
      'message', 'An unexpected error occurred. Please try again later.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get available group subscriptions
CREATE OR REPLACE FUNCTION public.api_get_available_subscriptions() RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Get available subscriptions with group and platform info
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gs.id,
      'group_id', gs.group_id,
      'group_name', g.name,
      'group_owner', (SELECT display_name FROM user_profiles WHERE id = g.owner_id),
      'platform_id', gs.platform_id,
      'platform_name', sp.name,
      'platform_icon', sp.icon,
      'platform_max_members', sp.max_members,
      'status', gs.status,
      'slots_total', gs.slots_total,
      'slots_available', gs.slots_available,
      'price_per_slot', gs.price_per_slot,
      'currency', gs.currency,
      'requirements_text', sp.requirements_text,
      'requirements_icon', sp.requirements_icon,
      'created_at', gs.created_at
    )
  ) INTO result
  FROM group_subs gs
  JOIN groups g ON gs.group_id = g.id
  JOIN subscription_platforms sp ON gs.platform_id = sp.id
  WHERE gs.status = 'active' AND gs.slots_available > 0;
  
  -- If no subscriptions found, return empty array
  IF result IS NULL THEN
    result := '[]'::jsonb;
  END IF;
  
  -- Return the result
  RETURN jsonb_build_object(
    'data', result,
    'count', jsonb_array_length(result)
  );
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
      'api_call',
      'group_subs',
      'error',
      'error',
      jsonb_build_object(
        'error', SQLERRM
      )
    );
    
    RETURN jsonb_build_object(
      'error', 'Internal server error',
      'status', 500,
      'message', 'An unexpected error occurred while fetching available subscriptions.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely purchase a subscription
CREATE OR REPLACE FUNCTION public.api_purchase_subscription(
  group_sub_id UUID,
  payment_method TEXT DEFAULT 'card',
  payment_provider TEXT DEFAULT 'stripe',
  payment_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  clerk_id TEXT;
  result JSONB;
BEGIN
  -- Get the current user's profile ID
  clerk_id := auth.clerk_user_id();
  
  -- If not authenticated, return error
  IF clerk_id IS NULL AND NOT is_development_mode() THEN
    RETURN jsonb_build_object(
      'error', 'Not authenticated',
      'status', 401,
      'message', 'You must be logged in to purchase a subscription'
    );
  END IF;
  
  -- Get the user profile ID
  SELECT id INTO user_id FROM user_profiles 
  WHERE external_auth_id = clerk_id;
  
  -- If in development mode and no user found, use a test user
  IF user_id IS NULL AND is_development_mode() THEN
    SELECT id INTO user_id FROM user_profiles
    WHERE external_auth_id LIKE 'dev%' OR external_auth_id LIKE 'mock%'
    ORDER BY created_at LIMIT 1;
    
    IF user_id IS NULL THEN
      -- Create a test user if none exists
      SELECT jsonb_extract_path(public.create_dev_test_user(), 'profile_id')::text::uuid INTO user_id;
    END IF;
  END IF;
  
  -- If user not found, return error
  IF user_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User profile not found',
      'status', 404,
      'message', 'Your user profile was not found. Please try logging out and back in.'
    );
  END IF;
  
  -- Check if group subscription exists and has available slots
  IF NOT EXISTS (
    SELECT 1 FROM group_subs 
    WHERE id = group_sub_id AND status = 'active' AND slots_available > 0
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Subscription not available',
      'status', 400,
      'message', 'This subscription is not available or has no slots available.'
    );
  END IF;
  
  -- Check if user already has this subscription
  IF EXISTS (
    SELECT 1 FROM purchase_records
    WHERE user_id = user_id AND group_sub_id = group_sub_id
    AND status IN ('pending_payment', 'payment_processing', 'completed')
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Already subscribed',
      'status', 400,
      'message', 'You already have this subscription.'
    );
  END IF;
  
  -- Process the payment
  SELECT process_payment(
    user_id,
    group_sub_id,
    payment_method,
    payment_provider,
    COALESCE(payment_id, 'pm_' || gen_random_uuid()::text)
  ) INTO result;
  
  -- Return the result
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Subscription purchased successfully',
    'data', result
  );
EXCEPTION
  WHEN others THEN
    -- Log the error
    INSERT INTO security_logs (
      user_id,
      action_type,
      resource_type,
      resource_id,
      status,
      details
    ) VALUES (
      user_id,
      'api_call',
      'purchase',
      group_sub_id::text,
      'error',
      jsonb_build_object(
        'error', SQLERRM,
        'group_sub_id', group_sub_id,
        'payment_method', payment_method
      )
    );
    
    RETURN jsonb_build_object(
      'error', 'Purchase failed',
      'status', 500,
      'message', 'An error occurred while processing your purchase. Please try again later.',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get current user's subscriptions
CREATE OR REPLACE FUNCTION public.api_get_my_subscriptions() RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  clerk_id TEXT;
  result JSONB;
BEGIN
  -- Get the current user's profile ID
  clerk_id := auth.clerk_user_id();
  
  -- If not authenticated, return error
  IF clerk_id IS NULL AND NOT is_development_mode() THEN
    RETURN jsonb_build_object(
      'error', 'Not authenticated',
      'status', 401,
      'message', 'You must be logged in to view your subscriptions'
    );
  END IF;
  
  -- Get the user profile ID
  SELECT id INTO user_id FROM user_profiles 
  WHERE external_auth_id = clerk_id;
  
  -- If in development mode and no user found, use a test user
  IF user_id IS NULL AND is_development_mode() THEN
    SELECT id INTO user_id FROM user_profiles
    WHERE external_auth_id LIKE 'dev%' OR external_auth_id LIKE 'mock%'
    ORDER BY created_at LIMIT 1;
    
    IF user_id IS NULL THEN
      -- Create a test user if none exists
      SELECT jsonb_extract_path(public.create_dev_test_user(), 'profile_id')::text::uuid INTO user_id;
    END IF;
  END IF;
  
  -- If user not found, return error
  IF user_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User profile not found',
      'status', 404,
      'message', 'Your user profile was not found. Please try logging out and back in.'
    );
  END IF;
  
  -- Get user's subscriptions with details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pr.id,
      'group_sub_id', pr.group_sub_id,
      'status', pr.status,
      'access_provided', pr.access_provided,
      'access_provided_at', pr.access_provided_at,
      'created_at', pr.created_at,
      'group_name', g.name,
      'platform_name', sp.name,
      'platform_icon', sp.icon,
      'price_per_slot', gs.price_per_slot,
      'currency', gs.currency,
      'seller', jsonb_build_object(
        'id', up.id,
        'display_name', up.display_name,
        'rating_avg', up.rating_avg,
        'rating_count', up.rating_count
      ),
      'transaction', CASE 
        WHEN t.id IS NOT NULL THEN 
          jsonb_build_object(
            'id', t.id,
            'amount', t.amount,
            'currency', t.currency,
            'status', t.status,
            'payment_method', t.payment_method,
            'created_at', t.created_at,
            'completed_at', t.completed_at
          )
        ELSE NULL 
      END,
      'access_instructions', CASE
        WHEN pr.access_provided AND pr.status = 'completed' THEN
          (SELECT jsonb_build_object(
            'id', ai.id,
            'encrypted_data', ai.encrypted_data,
            'data_key_enc', ai.data_key_enc,
            'iv', ai.iv,
            'encryption_version', ai.encryption_version
          )
          FROM access_instructions ai
          WHERE ai.group_sub_id = pr.group_sub_id
          LIMIT 1)
        ELSE NULL
      END
    )
  ) INTO result
  FROM purchase_records pr
  JOIN group_subs gs ON pr.group_sub_id = gs.id
  JOIN groups g ON gs.group_id = g.id
  JOIN user_profiles up ON g.owner_id = up.id
  JOIN subscription_platforms sp ON gs.platform_id = sp.id
  LEFT JOIN transactions t ON pr.id = t.purchase_record_id
  WHERE pr.user_id = user_id
  ORDER BY pr.created_at DESC;
  
  -- If no subscriptions found, return empty array
  IF result IS NULL THEN
    result := '[]'::jsonb;
  END IF;
  
  -- Return the result
  RETURN jsonb_build_object(
    'data', result,
    'count', jsonb_array_length(result)
  );
EXCEPTION
  WHEN others THEN
    -- Log the error
    INSERT INTO security_logs (
      user_id,
      action_type,
      resource_type,
      resource_id,
      status,
      details
    ) VALUES (
      user_id,
      'api_call',
      'subscriptions',
      'my_subscriptions',
      'error',
      jsonb_build_object(
        'error', SQLERRM
      )
    );
    
    RETURN jsonb_build_object(
      'error', 'Internal server error',
      'status', 500,
      'message', 'An unexpected error occurred while fetching your subscriptions.',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get debug information for troubleshooting
-- Only available in development mode for security
CREATE OR REPLACE FUNCTION public.api_get_debug_info() RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if development mode is enabled
  IF NOT is_development_mode() THEN
    RETURN jsonb_build_object(
      'error', 'Development mode not enabled',
      'status', 403,
      'message', 'This function is only available in development mode'
    );
  END IF;
  
  -- Get debug information
  result := jsonb_build_object(
    'auth_status', public.get_auth_status(),
    'jwt_claims', auth.get_jwt_claims(),
    'current_role', current_setting('role'),
    'request_headers', nullif(current_setting('request.headers', true), '')::jsonb,
    'development_mode', is_development_mode(),
    'recent_logs', (
      SELECT jsonb_agg(l)
      FROM (
        SELECT * FROM security_logs
        ORDER BY created_at DESC
        LIMIT 50
      ) l
    ),
    'recent_users', (
      SELECT jsonb_agg(u)
      FROM (
        SELECT * FROM user_profiles
        ORDER BY created_at DESC
        LIMIT 10
      ) u
    ),
    'recent_purchases', (
      SELECT jsonb_agg(p)
      FROM (
        SELECT * FROM purchase_records
        ORDER BY created_at DESC
        LIMIT 10
      ) p
    ),
    'clerk_counters', (
      SELECT jsonb_agg(c)
      FROM clerk_integration_counters c
    ),
    'database_stats', (
      SELECT jsonb_build_object(
        'user_profiles_count', (SELECT COUNT(*) FROM user_profiles),
        'group_subs_count', (SELECT COUNT(*) FROM group_subs),
        'purchase_records_count', (SELECT COUNT(*) FROM purchase_records),
        'transactions_count', (SELECT COUNT(*) FROM transactions),
        'security_logs_count', (SELECT COUNT(*) FROM security_logs)
      )
    )
  );
  
  -- Return the result
  RETURN result;
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'error', 'Debug info error',
      'status', 500,
      'message', 'An error occurred while fetching debug information',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for all API functions
COMMENT ON FUNCTION public.api_get_current_user IS 'API function to safely get the current user''s profile';
COMMENT ON FUNCTION public.api_get_available_subscriptions IS 'API function to get all available group subscriptions';
COMMENT ON FUNCTION public.api_purchase_subscription IS 'API function to purchase a subscription';
COMMENT ON FUNCTION public.api_get_my_subscriptions IS 'API function to get the current user''s subscriptions';
COMMENT ON FUNCTION public.api_get_debug_info IS 'API function to get debug information (development mode only)';