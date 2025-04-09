import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

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
        try {
          const authInstance = auth();
          if (!authInstance) {
            console.log('No auth instance available in server context');
            return null;
          }
          
          return authInstance.getToken();
        } catch (error) {
          console.error('Error getting token in server context:', error);
          return null;
        }
      }
    }
  );
}