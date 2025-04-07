import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client with authorization from Clerk token
 * @param {Object} user - Current Clerk user
 * @returns Supabase client with auth headers
 */
export async function getAuthenticatedSupabaseClient(user) {
  if (!user) return createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Pobierz token z template "supabase" dla poprawnej integracji
    const token = await user.getToken({ template: "supabase" });
    
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
    // W przypadku błędu zwróć klienta anonimowego
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}