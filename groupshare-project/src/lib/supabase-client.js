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

// Helper function to create a authenticated client with a Clerk token
export const createSupabaseClient = (clerkToken) => {
  if (clerkToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${clerkToken}`
        }
      }
    });
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Pobiera oferty subskrypcji z możliwością filtrowania
 * @param {Object} filters - Filtry do zapytania
 * @param {string} filters.platformId - ID platformy do filtrowania
 * @param {number} filters.minPrice - Minimalna cena
 * @param {number} filters.maxPrice - Maksymalna cena
 * @param {boolean} filters.availableSlots - Czy pokazywać tylko oferty z dostępnymi miejscami
 * @param {string} filters.orderBy - Pole do sortowania
 * @param {boolean} filters.ascending - Kierunek sortowania (rosnąco/malejąco)
 * @param {number} filters.limit - Limit wyników
 * @param {number} filters.offset - Przesunięcie wyników (paginacja)
 * @returns {Promise<Array>} - Lista ofert subskrypcji
 */
export async function getSubscriptionOffers(filters = {}) {
  try {
    // Przygotowanie zapytania
    let query = supabase
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name, description),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
      `)
      .eq('status', 'active');
    
    // Dodaj filtr na platformę
    if (filters.platformId) {
      query = query.eq('platform_id', filters.platformId);
    }
    
    // Dodaj filtr na cenę minimalną
    if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
      query = query.gte('price_per_slot', filters.minPrice);
    }
    
    // Dodaj filtr na cenę maksymalną
    if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
      query = query.lte('price_per_slot', filters.maxPrice);
    }
    
    // Filtruj oferty tylko z dostępnymi miejscami
    if (filters.availableSlots !== false) {
      query = query.gt('slots_available', 0);
    }
    
    // Sortowanie
    const orderBy = filters.orderBy || 'created_at';
    const ascending = filters.ascending || false;
    query = query.order(orderBy, { ascending });
    
    // Limit i paginacja
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    // Wykonaj zapytanie
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching subscription offers:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getSubscriptionOffers:', error);
    throw error;
  }
}

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