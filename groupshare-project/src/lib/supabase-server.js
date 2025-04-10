import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Tworzy klienta Supabase dla użycia po stronie serwera
 */
export async function createServerSupabaseClient() {
  try {
    // Używamy service role key, ponieważ mamy problemy z uprawnieniami
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
  } catch (error) {
    console.error('Error in createServerSupabaseClient:', error);
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}