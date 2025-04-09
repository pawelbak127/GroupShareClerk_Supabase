import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from './supabase-admin-client';
import { createServerSupabaseClient } from './supabase-server';

/**
 * Pobiera aktualny profil użytkownika z bazy danych
 */
export async function getCurrentUserProfile() {
  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }
    
    console.log('Getting profile for user:', user.id);
    
    // Używamy supabaseAdmin, które ma pełne uprawnienia (pomija RLS)
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', user.id)
      .single();
    
    if (error) {
      // Ignorujemy błąd "nie znaleziono" (PGRST116)
      if (error.code === 'PGRST116') {
        console.log('No profile found for user:', user.id);
        return null;
      }
      
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    console.log('Found profile for user:', user.id);
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
  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }
    
    console.log('Getting or creating profile for user:', user.id);
    
    // Próba pobrania istniejącego profilu
    const userProfile = await getCurrentUserProfile();
    
    // Jeśli profil istnieje, zwróć go
    if (userProfile) {
      return userProfile;
    }
    
    console.log('Creating new profile for user:', user.id);
    
    // W przeciwnym razie utwórz nowy profil
    const newProfile = {
      external_auth_id: user.id,
      display_name: user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : (user.username || user.emailAddresses?.[0]?.emailAddress.split('@')[0] || 'Nowy użytkownik'),
      email: user.emailAddresses?.[0]?.emailAddress || '',
      phone_number: user.phoneNumbers?.[0]?.phoneNumber || null,
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
    
    console.log('Successfully created profile for user:', user.id);
    return createdProfile;
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    return null;
  }
}

/**
 * Aktualizuje profil użytkownika
 */
export async function updateUserProfile(userId, profileData) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in updateUserProfile:', error);
    throw error;
  }
}

/**
 * Pobiera profil użytkownika używając uwierzytelnionego klienta
 */
export async function getUserProfileWithAuth() {
  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }
    
    // Użyj uwierzytelnionego klienta Supabase
    const supabaseAuth = createServerSupabaseClient();
    
    const { data, error } = await supabaseAuth
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile with auth:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in getUserProfileWithAuth:', error);
    return null;
  }
}

/**
 * Sprawdza, czy użytkownik ma prawidłową sesję Clerk
 */
export async function verifyUserSession() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return false;
    }
    
    // Sprawdź, czy możemy pobrać sesję i token
    try {
      const userSession = await user.getSession();
      if (!userSession) {
        return false;
      }
      
      const token = await userSession.getToken();
      return !!token;
    } catch (error) {
      console.error('Error verifying user session:', error);
      return false;
    }
  } catch (error) {
    console.error('Exception in verifyUserSession:', error);
    return false;
  }
}