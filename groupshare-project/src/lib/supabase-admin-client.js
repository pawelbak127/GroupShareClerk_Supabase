import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY'
  );
}

// Dodaj diagnostyczne informacje
console.log("Inicjalizacja supabaseAdmin z kluczem serwisowym");
console.log("URL:", supabaseUrl);
console.log("Key length:", supabaseServiceKey ? supabaseServiceKey.length : 0);
console.log("Key prefix:", supabaseServiceKey ? supabaseServiceKey.substring(0, 5) + '...' : 'undefined');

// Klient z uprawnieniami administratora, używany TYLKO na serwerze
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // Wyłącz RLS - spróbujmy różne podejścia
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-supabase-bypass-rls': 'true'
    }
  }
});

// Test połączenia
async function testConnection() {
  try {
    console.log("Próba pobrania profili użytkowników");
    const { data, error, status, statusText } = await supabaseAdmin
      .from('user_profiles')
      .select('id, external_auth_id, display_name')
      .limit(5);
    
    if (error) {
      console.error('Błąd testowego połączenia do Supabase (admin):', {
        error,
        status,
        statusText,
        errorDetails: error.details
      });
    } else {
      console.log('Pomyślne testowe połączenie do Supabase (admin)');
      console.log('Pobrane profile:', data);
    }
  } catch (e) {
    console.error('Wyjątek podczas testowego połączenia:', e);
  }
}

// Uruchom test połączenia podczas inicjalizacji
testConnection();

export default supabaseAdmin;