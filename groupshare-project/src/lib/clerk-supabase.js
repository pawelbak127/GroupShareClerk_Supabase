import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

/**
 * Tworzy klienta Supabase z uwierzytelnianiem Clerk
 * używając nowej integracji Clerk-Supabase
 * 
 * Obsługuje zarówno środowisko klienta jak i serwera
 * 
 * @param {Object} user - Obiekt użytkownika Clerk (opcjonalny)
 * @returns {Object} Klient Supabase z uwierzytelnianiem
 */
export async function getAuthenticatedSupabaseClient(user = null) {
  try {
    // Jeśli nie dostarczono użytkownika, zwróć anonimowego klienta
    if (!user) {
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Użyj API auth() z Clerk, które działa zarówno na serwerze jak i kliencie
    const authInstance = auth();
    if (!authInstance) {
      console.warn('No Clerk auth instance available, returning anonymous client');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Utwórz klienta używając nowej metody integracji
    return createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          // Ustaw stałe nagłówki dla wszystkich zapytań
          headers: {
            'x-clerk-auth-reason': 'supabase-integration'
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        // To jest kluczowa zmiana - funkcja accessToken zwracająca token z Clerk
        async accessToken() {
          try {
            // Pobierz token bezpośrednio z instancji auth()
            return await authInstance.getToken();
          } catch (error) {
            console.warn('Failed to get token from auth instance:', error);
            return null;
          }
        }
      }
    );
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}

/**
 * Tworzy klienta Supabase z sesją Clerk
 * zgodnie z nową integracją
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
          // Pobierz token z sesji
          return await session.getToken();
        } catch (error) {
          console.warn('Failed to get token from session:', error);
          return null;
        }
      }
    }
  );
}