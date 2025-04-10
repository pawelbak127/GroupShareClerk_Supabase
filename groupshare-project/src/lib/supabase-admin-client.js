import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sprawdź zmienne środowiskowe
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('URL:', supabaseUrl?.substring(0, 10) + '...');
  console.log('Key defined:', !!supabaseServiceKey);
}

// Utwórz klienta admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Sprawdź czy klient ma metodę from()
if (!supabaseAdmin || typeof supabaseAdmin.from !== 'function') {
  console.error('supabaseAdmin client is not properly initialized');
  console.log('supabaseAdmin:', supabaseAdmin ? 'defined' : 'undefined');
  console.log('from method:', supabaseAdmin && typeof supabaseAdmin.from === 'function' ? 'exists' : 'missing');
}

export default supabaseAdmin;