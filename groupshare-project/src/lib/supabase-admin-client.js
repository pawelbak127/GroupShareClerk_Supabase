import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sprawdź zmienne środowiskowe
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for admin client');
  console.log('URL:', supabaseUrl?.substring(0, 10) + '...');
  console.log('Service key defined:', !!supabaseServiceKey);
}

// Utwórz klienta admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-supabase-bypass-rls': 'true'
    }
  }
});

// Sprawdź czy klient ma metodę from()
if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
  console.error('supabaseAdmin client is not properly initialized');
  console.log('supabaseAdmin:', supabaseAdmin ? 'defined' : 'undefined');
  console.log('from method:', supabaseAdmin && typeof supabaseAdmin.from === 'function' ? 'exists' : 'missing');
}

// Wykonaj test połączenia
const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin.from('user_profiles').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Admin client test failed:', error);
      return false;
    }
    
    console.log('Admin client test successful');
    return true;
  } catch (err) {
    console.error('Admin client test exception:', err);
    return false;
  }
};

// Wywołaj test, ale nie czekaj na jego zakończenie
testConnection();

export default supabaseAdmin;