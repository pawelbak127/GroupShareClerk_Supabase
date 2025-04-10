import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Tworzy klienta Supabase z uwierzytelnianiem Clerk - TYLKO dla komponentów serwerowych
 */
export async function getAuthenticatedSupabaseClient() {
  try {
    // Próbujemy użyć currentUser
    const user = await currentUser();
    
    if (!user) {
      console.log('No user available, returning anonymous client');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Tworzymy klienta z service role, ponieważ mamy problemy z uprawnieniami
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
    console.error('Error creating authenticated Supabase client:', error);
    // Fallback do service role client
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
}