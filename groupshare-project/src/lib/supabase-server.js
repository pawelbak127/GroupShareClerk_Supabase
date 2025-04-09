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
      global: {
        headers: {
          'x-clerk-auth-reason': 'server-component'
        }
      },
      async accessToken() {
        try {
          // Pobierz instancję auth z Clerk
          const authInstance = auth();
          if (!authInstance) {
            console.log('No auth instance available in server context');
            return null;
          }
          
          // Pobierz token bez parametru template zgodnie z nową integracją
          return await authInstance.getToken();
        } catch (error) {
          console.error('Error getting token in server context:', error);
          return null;
        }
      }
    }
  );
}