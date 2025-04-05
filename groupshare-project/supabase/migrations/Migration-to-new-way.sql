-- Migracja do integracji Clerk z Supabase
-- Plik należy dodać do katalogu migrations i wykonać w konsoli Supabase

-- CZĘŚĆ 1: FUNKCJE POMOCNICZE DLA INTEGRACJI Z CLERK

-- Funkcja pobierająca ID użytkownika Clerk z tokenu JWT
CREATE OR REPLACE FUNCTION auth.clerk_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja zwracająca ID profilu użytkownika na podstawie Clerk ID
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

-- Funkcja zwracająca aktualnie zalogowanego użytkownika
CREATE OR REPLACE FUNCTION public.current_user_profile_id() RETURNS UUID AS $$
BEGIN
  RETURN get_user_profile_id(auth.clerk_user_id());
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja sprawdzająca czy użytkownik istnieje
CREATE OR REPLACE FUNCTION public.clerk_user_exists() RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE external_auth_id = auth.clerk_user_id()
  ));
END
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CZĘŚĆ 2: TRIGGERY I FUNKCJE AUTOMATYZUJĄCE INTEGRACJĘ

-- Trigger do automatycznego tworzenia profilu użytkownika
-- Uwaga: W Supabase należy skonfigurować Webhook z Clerk, który będzie
-- wywoływać tę funkcję przy utworzeniu nowego użytkownika
CREATE OR REPLACE FUNCTION create_profile_for_clerk_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (
    external_auth_id,
    display_name,
    email,
    profile_type,
    verification_level,
    created_at,
    updated_at
  ) VALUES (
    NEW.id::text,
    COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email),
    NEW.email,
    'both',
    'basic',
    NOW(),
    NOW()
  )
  ON CONFLICT (external_auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja publiczna do wywołania przez Webhook z Clerk
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
  -- Sprawdź czy użytkownik już istnieje
  IF EXISTS (SELECT 1 FROM user_profiles WHERE external_auth_id = user_id) THEN
    -- Aktualizuj istniejącego użytkownika
    UPDATE user_profiles
    SET 
      display_name = COALESCE(first_name || ' ' || last_name, email),
      email = handle_clerk_user_creation.email,
      avatar_url = image_url,
      updated_at = NOW()
    WHERE external_auth_id = user_id;
    
    result := jsonb_build_object(
      'status', 'updated',
      'user_id', user_id
    );
  ELSE
    -- Utwórz nowego użytkownika
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
      COALESCE(first_name || ' ' || last_name, email),
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

-- CZĘŚĆ 3: AKTUALIZACJA POLITYK RLS DLA INTEGRACJI

-- Najpierw usuń istniejące polityki które mogą kolidować
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public users can view basic profile info" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view full profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service can insert profiles" ON user_profiles;

-- Nowe polityki dla user_profiles
CREATE POLICY "Użytkownicy mogą wyświetlać dowolne profile" 
ON user_profiles FOR SELECT USING (true);

CREATE POLICY "Użytkownicy mogą aktualizować swoje profile" 
ON user_profiles FOR UPDATE 
USING (auth.clerk_user_id() = external_auth_id);

CREATE POLICY "Użytkownicy mogą wstawiać swoje profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.clerk_user_id() = external_auth_id OR auth.role() = 'service_role');

-- Aktualizacja polityk dla groups
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON groups;

CREATE POLICY "Zalogowani użytkownicy mogą tworzyć grupy" 
ON groups FOR INSERT 
WITH CHECK (auth.clerk_user_id() IS NOT NULL);

CREATE POLICY "Właściciele grup mogą aktualizować swoje grupy" 
ON groups FOR UPDATE 
USING ((SELECT external_auth_id FROM user_profiles WHERE id = owner_id) = auth.clerk_user_id());

CREATE POLICY "Właściciele grup mogą usuwać swoje grupy" 
ON groups FOR DELETE 
USING ((SELECT external_auth_id FROM user_profiles WHERE id = owner_id) = auth.clerk_user_id());

-- Aktualizacja polityk dla group_members
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
DROP POLICY IF EXISTS "Group admins can update members" ON group_members;
DROP POLICY IF EXISTS "Group admins can delete members" ON group_members;

CREATE POLICY "Użytkownicy mogą widzieć członków swoich grup" 
ON group_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_members.group_id
    AND up.external_auth_id = auth.clerk_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id 
    WHERE g.id = group_members.group_id
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

CREATE POLICY "Admini grup mogą dodawać członków" 
ON group_members FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_members.group_id
    AND gm.role = 'admin'
    AND up.external_auth_id = auth.clerk_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id 
    WHERE g.id = group_members.group_id
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

CREATE POLICY "Admini grup mogą aktualizować członków" 
ON group_members FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_members.group_id
    AND gm.role = 'admin'
    AND up.external_auth_id = auth.clerk_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id 
    WHERE g.id = group_members.group_id
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

CREATE POLICY "Admini grup mogą usuwać członków" 
ON group_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_members.group_id
    AND gm.role = 'admin'
    AND up.external_auth_id = auth.clerk_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id 
    WHERE g.id = group_members.group_id
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

-- Aktualizacja polityk dla group_subs
DROP POLICY IF EXISTS "Public users can view active subscription offers" ON group_subs;
DROP POLICY IF EXISTS "Group admins can manage subscription offers" ON group_subs;

CREATE POLICY "Każdy może widzieć aktywne oferty subskrypcji" 
ON group_subs FOR SELECT 
USING (status = 'active');

CREATE POLICY "Admini grup mogą zarządzać ofertami subskrypcji" 
ON group_subs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM groups g
    JOIN user_profiles up ON g.owner_id = up.id
    WHERE g.id = group_subs.group_id
    AND up.external_auth_id = auth.clerk_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN user_profiles up ON gm.user_id = up.id
    WHERE gm.group_id = group_subs.group_id
    AND gm.role = 'admin'
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

-- Aktualizacja polityk dla purchase_records
DROP POLICY IF EXISTS "Users can view relevant purchase records" ON purchase_records;
DROP POLICY IF EXISTS "Authenticated users can create purchase records" ON purchase_records;
DROP POLICY IF EXISTS "Users can update own purchase records" ON purchase_records;
DROP POLICY IF EXISTS "Group admins can update purchase records" ON purchase_records;

CREATE POLICY "Użytkownicy mogą widzieć swoje zakupy" 
ON purchase_records FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = purchase_records.user_id
    AND up.external_auth_id = auth.clerk_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM group_subs gs
    JOIN groups g ON gs.group_id = g.id
    JOIN user_profiles up ON g.owner_id = up.id
    WHERE gs.id = purchase_records.group_sub_id
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

CREATE POLICY "Zalogowani użytkownicy mogą tworzyć zakupy" 
ON purchase_records FOR INSERT 
WITH CHECK (
  auth.clerk_user_id() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = purchase_records.user_id
    AND up.external_auth_id = auth.clerk_user_id()
  ) AND
  (SELECT slots_available FROM group_subs WHERE id = group_sub_id) > 0
);

CREATE POLICY "Użytkownicy mogą aktualizować swoje zakupy" 
ON purchase_records FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = purchase_records.user_id
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

-- Aktualizacja polityk dla transactions
CREATE POLICY "Użytkownicy mogą widzieć swoje transakcje" 
ON transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE (up.id = transactions.buyer_id OR up.id = transactions.seller_id)
    AND up.external_auth_id = auth.clerk_user_id()
  )
);

-- CZĘŚĆ 4: DODANIE KOMENTARZY I INSTRUKCJI KONFIGURACJI

COMMENT ON FUNCTION auth.clerk_user_id IS 'Pobiera ID użytkownika Clerk z tokenu JWT';
COMMENT ON FUNCTION public.get_user_profile_id IS 'Zwraca ID profilu użytkownika z bazy danych na podstawie ID Clerk';
COMMENT ON FUNCTION public.current_user_profile_id IS 'Zwraca ID profilu aktualnie zalogowanego użytkownika';
COMMENT ON FUNCTION public.clerk_user_exists IS 'Sprawdza czy użytkownik Clerk istnieje w tabeli user_profiles';
COMMENT ON FUNCTION public.handle_clerk_user_creation IS 'Funkcja obsługująca Webhook z Clerk przy tworzeniu użytkownika';

-- Wskazówki konfiguracji webhook w komentarzu
COMMENT ON SCHEMA public IS '
INSTRUKCJA KONFIGURACJI CLERK-SUPABASE:

1. Konfiguracja Clerk:
   - Dodaj szablon JWT dla Supabase w panelu Clerk (JWT Templates)
   - Ustaw opcje "User ID in JWT" na "User ID"
   - Uwzględnij wymagane dane użytkownika w "Claims"

2. Konfiguracja Supabase:
   - Dodaj Clerk jako zewnętrznego dostawcę JWT: 
     Project Settings > API > JWT Settings > JWT Autohrization > Custom JWT
   - Wprowadź publikowany URL JWKS z Clerk
   - W polu "JWT Claims" ustaw "sub" jako źródło ID użytkownika

3. Konfiguracja Webhooków:
   - Skonfiguruj webhook w Clerk dla zdarzeń "user.created" i "user.updated"
   - Webhook powinien wywoływać funkcję "handle_clerk_user_creation"
';

-- Liczniki wywołań funkcji integracyjnych dla łatwiejszego debugowania
CREATE TABLE IF NOT EXISTS clerk_integration_counters (
  function_name TEXT PRIMARY KEY,
  calls INTEGER DEFAULT 0,
  last_called TIMESTAMP WITH TIME ZONE,
  last_success BOOLEAN
);

-- Funkcja do śledzenia wywołań funkcji integracyjnych
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