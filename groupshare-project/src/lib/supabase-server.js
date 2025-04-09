import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

/**
 * Tworzy klienta Supabase dla użycia po stronie serwera
 * zgodnie z nową integracją Clerk-Supabase
 */
export async function createServerSupabaseClient() {
  try {
    const authInstance = auth();
    
    if (!authInstance) {
      console.log('No auth instance available');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Zgodnie z nową integracją, używamy metody getToken() bez parametrów
    const token = await authInstance.getToken();
    
    if (!token) {
      console.log('No token received from Clerk');
      return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    console.log('Creating authenticated server Supabase client');
    
    return createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
      }
    );
  } catch (error) {
    console.error('Error creating server Supabase client:', error);
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}