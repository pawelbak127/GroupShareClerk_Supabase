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
  
  try {
    // Zgodnie z nową integracją - pobierz standardowy token bez parametru template
    const token = await user.getToken();
    
    // Utwórz klienta z tokenem Clerk
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  } catch (error) {
    console.error('Error getting authenticated Supabase client:', error);
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}

/**
 * Tworzy klienta Supabase z sesją Clerk (nowa integracja)
 * @param {Object} session - Sesja Clerk
 * @returns {Object} Klient Supabase z uwierzytelnianiem
 */
export function createClerkSupabaseClient(session) {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      async accessToken() {
        return session?.getToken() ?? null;
      },
    }
  );
}