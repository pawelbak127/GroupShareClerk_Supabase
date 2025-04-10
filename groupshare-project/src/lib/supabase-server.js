// src/lib/supabase-server.js
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Obsługa obu możliwych nazw zmiennych
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Tworzy klienta Supabase dla użycia po stronie serwera z uwierzytelnianiem Clerk
 * 
 * @returns {Promise<Object>} Klient Supabase
 */
export async function createServerSupabaseClient() {
  // Wyświetl informacje o dostępnych zmiennych środowiskowych
  console.log('Environment variables check:');
  console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NEXT_PUBLIC_SUPABASE_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_KEY/ANON_KEY');
    console.error('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...');
    console.error('KEY:', (process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'exists' : 'missing');
  }
  
  try {
    // Używamy auth() z Clerk, który jest dostępny po stronie serwera
    const authObject = auth();
    
    if (!authObject) {
      console.log('No auth object available in createServerSupabaseClient');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
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
            // Pobieramy token bezpośrednio za pomocą api auth()
            return await authObject.getToken();
          } catch (error) {
            console.error('Error getting token in createServerSupabaseClient:', error);
            return null;
          }
        }
      }
    );
  } catch (error) {
    console.error('Error in createServerSupabaseClient:', error);
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}