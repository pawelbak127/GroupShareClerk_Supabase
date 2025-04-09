import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY'
  );
}

// Klient z uprawnieniami administratora, używany TYLKO na serwerze
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // Ustaw globalne nagłówki do omijania RLS i debugowania
  global: {
    headers: {
      'x-supabase-bypass-rls': 'true',
      'x-supabase-client': 'admin-client'
    }
  }
});

export default supabaseAdmin;