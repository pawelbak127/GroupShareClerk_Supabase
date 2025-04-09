import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

/**
 * Tworzy klienta Supabase z uwierzytelnianiem Clerk
 * @param {Object} user - Obiekt użytkownika Clerk
 * @returns {Promise<Object>} Klient Supabase z uwierzytelnianiem
 */
export async function getAuthenticatedSupabaseClient(user) {
  if (!user) return createClient(supabaseUrl, supabaseAnonKey);
  
  // Użyj podejścia z funkcją accessToken zgodnie z nową integracją
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      async accessToken() {
        try {
          // Pobierz sesję i token bezpośrednio z sesji
          const userSession = await user.getSession();
          if (userSession) {
            return userSession.getToken();
          }
          return null;
        } catch (error) {
          console.warn('Failed to get token from Clerk:', error);
          return null;
        }
      }
    }
  );
}

/**
 * Tworzy klienta Supabase z sesją Clerk (nowa integracja)
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
      async accessToken() {
        try {
          return session.getToken();
        } catch (error) {
          console.warn('Failed to get token from session:', error);
          return null;
        }
      }
    }
  );
}