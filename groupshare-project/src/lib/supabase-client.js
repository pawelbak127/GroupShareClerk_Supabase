import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Funkcja tworząca klienta Supabase z opcjonalnym tokenem sesji
export function getSupabaseClient(sessionToken = null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: sessionToken ? {
        Authorization: `Bearer ${sessionToken}`
      } : {}
    },
    auth: {
      persistSession: false
    }
  });
}

// Klient anonimowy do operacji niewymagających uwierzytelnienia
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;