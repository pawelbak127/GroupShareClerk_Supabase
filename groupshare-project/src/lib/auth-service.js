import { currentUser } from '@clerk/nextjs/server';
import supabase from './supabase-client';
import supabaseAdmin from './supabase-admin-client';
import { getAuthenticatedSupabaseClient } from './clerk-supabase';

/**
 * Pobiera aktualny profil użytkownika z bazy danych
 */
export async function getCurrentUserProfile() {
  const user = await currentUser();
  
  if (!user) return null;
  
  try {
    // Spróbuj pobrać istniejący profil używając supabaseAdmin (pomija RLS)
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in getCurrentUserProfile:', error);
    return null;
  }
}

/**
 * Pobiera profil użytkownika Clerk i tworzy go jeśli nie istnieje
 */
export async function getOrCreateUserProfile() {
  const user = await currentUser();
  
  if (!user) return null;
  
  try {
    // Próba pobrania istniejącego profilu
    const userProfile = await getCurrentUserProfile();
    
    // Jeśli profil istnieje, zwróć go
    if (userProfile) {
      return userProfile;
    }
    
    // W przeciwnym razie utwórz nowy profil
    const newProfile = {
      external_auth_id: user.id,
      display_name: user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : (user.username || 'Nowy użytkownik'),
      email: user.emailAddresses && user.emailAddresses[0]?.emailAddress || '',
      phone_number: user.phoneNumbers && user.phoneNumbers[0]?.phoneNumber || null,
      profile_type: 'both',
      verification_level: 'basic',
      bio: '',
      avatar_url: user.imageUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Użyj supabaseAdmin, który ma uprawnienia service_role i pomija RLS
    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert([newProfile])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user profile with supabaseAdmin:', createError);
      return null;
    }
    
    return createdProfile;
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    return null;
  }
}