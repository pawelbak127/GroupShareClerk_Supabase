import { currentUser, auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Tworzy klienta Supabase z uwierzytelnianiem Clerk dla komponentów serwerowych (Server Components)
 * 
 * Ta funkcja używa nowej natywnej integracji Clerk-Supabase
 * 
 * @param {Object} user - Opcjonalny obiekt użytkownika Clerk (z currentUser())
 * @returns {Promise<Object>} Klient Supabase z uwierzytelnianiem
 */
export async function getAuthenticatedSupabaseClient(user = null) {
  try {
    // Próbujemy użyć currentUser jeśli nie został przekazany
    if (!user) {
      user = await currentUser();
    }
    
    if (!user) {
      console.log('No user available, returning anonymous client');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Pobieramy instancję auth, aby pobrać token
    const authInstance = auth();
    
    if (!authInstance) {
      console.warn('No auth instance available, using anonymous client');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Tworzymy klienta z tokenem Clerk używając nowej integracji
    return createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            'x-clerk-auth-reason': 'supabase-integration'
          }
        },
        async accessToken() {
          try {
            // Używamy nowej metody integracji (bez parametru template)
            return await authInstance.getToken();
          } catch (tokenError) {
            console.error('Error getting auth token:', tokenError);
            return null;
          }
        }
      }
    );
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    // Fallback - zwracamy anonimowego klienta
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}

/**
 * Tworzy klienta Supabase z uprawnieniami administracyjnymi, omijając RLS
 * 
 * UWAGA: Ta funkcja powinna być używana tylko w kontekstach administracyjnych,
 * gdzie potrzebny jest pełny dostęp do bazy danych z pominięciem RLS.
 * 
 * @returns {Object} Klient Supabase z uprawnieniami administratora
 */
export function getAdminSupabaseClient() {
  if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'x-supabase-bypass-rls': 'true'
      }
    }
  });
}