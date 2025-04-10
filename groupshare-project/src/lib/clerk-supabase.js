import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

/**
 * Tworzy klienta Supabase z sesją Clerk - wersja dla komponentów klienckich
 * @param {Object} session - Sesja Clerk
 * @returns {Object} Klient Supabase z uwierzytelnianiem
 */
export function createClerkSupabaseClient(session) {
  if (!session) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          'x-clerk-auth-reason': 'supabase-integration'
        }
      },
      async accessToken() {
        try {
          return await session.getToken();
        } catch (error) {
          console.warn('Failed to get token from session:', error);
          return null;
        }
      }
    }
  );
}

/**
 * Tworzy klienta Supabase z tokenem Clerk - wersja dla komponentów klienckich
 * @param {function} getTokenFn - Funkcja zwracająca token
 * @returns {Object} Klient Supabase z uwierzytelnianiem
 */
export function createTokenBasedSupabaseClient(getTokenFn) {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          'x-clerk-auth-reason': 'supabase-integration'
        }
      },
      async accessToken() {
        try {
          return await getTokenFn();
        } catch (error) {
          console.warn('Failed to get token:', error);
          return null;
        }
      }
    }
  );
}