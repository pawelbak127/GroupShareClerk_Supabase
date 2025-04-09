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
          // W najnowszej wersji Clerk, auth() nie ma bezpośrednio metody getToken()
          // Zamiast tego, sam obiekt auth jest funkcją, którą można użyć do pobrania tokenu
          const authObject = auth();
          if (!authObject) {
            console.log('No auth instance available in server context');
            return null;
          }
          
          // W aktualnej wersji Clerk token jest tak pobierany
          return await authObject.getToken({ template: 'supabase' });
        } catch (error) {
          console.error('Error getting token in server context:', error);
          return null;
        }
      }
    }
  );
}