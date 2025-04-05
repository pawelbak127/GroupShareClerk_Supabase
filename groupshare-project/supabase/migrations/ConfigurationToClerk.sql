-- Dodawanie wyzwalaczy (triggers) dla integracji Clerk-Supabase
-- Te wyzwalacze należy uruchomić po zainstalowaniu funkcji

-- Wyzwalacz dla funkcji auth.clerk_user_id()
CREATE OR REPLACE FUNCTION wrap_clerk_user_id() RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  BEGIN
    result := auth.clerk_user_id();
    PERFORM track_clerk_function_call('auth.clerk_user_id', true);
    RETURN result;
  EXCEPTION
    WHEN others THEN
      PERFORM track_clerk_function_call('auth.clerk_user_id', false);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wyzwalacz na automatyczną aktualizację czasu modyfikacji w profilach użytkowników
CREATE OR REPLACE TRIGGER update_user_profile_on_auth_change
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_clerk_user();

-- Utwórz wyzwalacz do logowania zmian użytkowników
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

CREATE TRIGGER log_user_profile_changes
AFTER INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION log_user_profile_changes();