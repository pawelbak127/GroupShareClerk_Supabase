import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Tworzy klienta Supabase dla użycia po stronie serwera
 * zgodnie z nową integracją Clerk-Supabase
 */
export function createServerSupabaseClient() {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      async accessToken() {
        return (await auth()).getToken();
      },
    }
  );
}