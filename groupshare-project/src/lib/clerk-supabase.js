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
  
  try {
    // First try to get the token with the template parameter (preferred method)
    if (typeof user.getToken === 'function') {
      try {
        const token = await user.getToken({ template: "supabase" });
        return createSupabaseClientWithAuth(token);
      } catch (err) {
        console.warn('Could not get token with template parameter:', err);
      }
    }
    
    // Fallback: try to get the token without any parameters
    if (typeof user.getToken === 'function') {
      try {
        const token = await user.getToken();
        return createSupabaseClientWithAuth(token);
      } catch (err) {
        console.warn('Could not get token without parameters:', err);
      }
    }
    
    // Fallback: try to access JWT directly (if available on user object)
    if (user.jwt) {
      return createSupabaseClientWithAuth(user.jwt);
    }
    
    // If all else fails, log a warning and return unauthenticated client
    console.warn('Could not get authentication token from user object, returning unauthenticated client');
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Error in getAuthenticatedSupabaseClient:', error);
    return createClient(supabaseUrl, supabaseAnonKey);
  }
}