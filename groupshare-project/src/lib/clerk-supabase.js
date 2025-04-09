// TEN PLIK JEST UŻYWANY TYLKO PO STRONIE SERWERA
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

/**
 * Tworzy klienta Supabase z uwierzytelnianiem Clerk
 * TYLKO DO UŻYTKU W KOMPONENTACH SERWEROWYCH
 * 
 * @returns {Object} Klient Supabase z uwierzytelnianiem
 */
export async function getAuthenticatedSupabaseClient() {
  try {
    // Użyj API auth() z Clerk
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
        // Pobierz token z Clerk z parametrem template
        async accessToken() {
          try {
            // Pobierz token bezpośrednio z instancji auth()
            return await authInstance.getToken({ template: 'supabase' });
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