import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Obsługa obu możliwych nazw zmiennych
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('Supabase URL defined:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Key defined:', !!(process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

/**
 * Tworzy klienta Supabase z sesją Clerk - wersja dla komponentów klienckich
 * 
 * To jest główna funkcja do użycia z nową natywną integracją Clerk-Supabase.
 * 
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
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      async accessToken() {
        try {
          // Używamy nowej metody integracji Clerk-Supabase (bez parametru template)
          return await session.getToken();
        } catch (error) {
          console.warn('Failed to get token from session:', error);
          return null;
        }
      }
    }
  );
}