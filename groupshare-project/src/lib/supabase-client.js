import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Create a single instance of the Supabase client to reuse across the app
// This client is for unauthenticated operations only
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Tworzy klienta Supabase z sesją Clerk (nowa integracja)
 * @param {Object} session - Sesja Clerk
 * @returns {Object} Klient Supabase z uwierzytelnianiem
 */
export const createSupabaseClient = (session) => {
  if (!session) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      async accessToken() {
        // Zgodnie z nową integracją, bez parametru template
        return session?.getToken() ?? null;
      }
    }
  );
};

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  
  // Return a standardized error object
  return {
    error: true,
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'unknown_error',
    details: error.details || null,
  };
};

// Export the default Supabase client (without auth)
export default supabase;