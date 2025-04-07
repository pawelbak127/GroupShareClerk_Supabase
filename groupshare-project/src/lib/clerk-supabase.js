import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client with authorization from Clerk token
 * @param {string} clerkToken - JWT token from Clerk
 * @returns Supabase client with auth headers
 */
export function createSupabaseClientWithAuth(clerkToken) {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${clerkToken}`
        }
      }
    }
  );
}

/**
 * Server-side function to get an authenticated Supabase client 
 * using the current user's Clerk token
 * @param {Object} user - Current Clerk user
 * @returns Supabase client with auth headers
 */
export async function getAuthenticatedSupabaseClient(user) {
  if (!user) return createClient(supabaseUrl, supabaseAnonKey);
  
  const token = await user.getToken({ template: "supabase" });
  
  return createSupabaseClientWithAuth(token);
}