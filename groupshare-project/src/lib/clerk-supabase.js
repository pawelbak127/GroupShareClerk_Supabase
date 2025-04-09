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
    // Jeśli nie dostarczono użytkownika, próbujemy użyć auth()
    let authInstance;
    
    if (!user) {
      try {
        authInstance = auth();
        if (!authInstance) {
          console.log('No auth instance available, returning anonymous client');
          return createClient(supabaseUrl, supabaseAnonKey);
        }
      } catch (error) {
        console.warn('Failed to get auth instance:', error);
        return createClient(supabaseUrl, supabaseAnonKey);
      }
    }
    
    // Utwórz klienta używając nowej metody integracji
    return createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          // Stałe nagłówki dla wszystkich zapytań
          headers: {
            'x-clerk-auth-reason': 'supabase-integration'
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        // Kluczowa zmiana - funkcja accessToken zwracająca token z Clerk bez parametru template
        async accessToken() {
          try {
            if (user && typeof user.getToken === 'function') {
              // Jeśli mamy bezpośrednio użytkownika z metodą getToken
              return await user.getToken();
            } else if (authInstance) {
              // Albo używamy instancji auth()
              return await authInstance.getToken();
            }
            return null;
          } catch (error) {
            console.warn('Failed to get token:', error);
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
          // Pobierz token bez parametru template zgodnie z nową integracją
          return await session.getToken();
        } catch (error) {
          console.warn('Failed to get token from session:', error);
          return null;
        }
      }
    }
  );
}