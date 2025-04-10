import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from './supabase-admin-client';
import { createServerSupabaseClient } from './supabase-server';
import { getAuthenticatedSupabaseClient } from './clerk-supabase-server';

/**
 * Pobiera aktualny profil użytkownika z bazy danych
 */
export async function getCurrentUserProfile() {
  try {
    // Pobierz użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }
    
    console.log('Getting profile for user:', user.id);
    
    // Tworzenie uwierzytelnionego klienta Supabase
    let profile = null;
    
    // First, try with authenticated client (should work with proper setup)
    try {
      const supabaseAuth = await getAuthenticatedSupabaseClient();
      
      const { data, error } = await supabaseAuth
        .from('user_profiles')
        .select('*')
        .eq('external_auth_id', user.id)
        .single();
        
      if (!error) {
        console.log('Found profile using authenticated client');
        profile = data;
      } else if (error.code !== 'PGRST116') { // Only log non-not-found errors
        console.error('Error fetching user profile with auth client:', error);
      }
    } catch (authError) {
      console.error('Exception using auth client:', authError);
    }
    
    // If that failed, try with server client
    if (!profile) {
      try {
        const supabaseClient = await createServerSupabaseClient();
        
        const { data, error } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .eq('external_auth_id', user.id)
          .single();
          
        if (!error) {
          console.log('Found profile using server client');
          profile = data;
        } else if (error.code !== 'PGRST116') { // Only log non-not-found errors
          console.error('Error fetching user profile with server client:', error);
        }
      } catch (serverError) {
        console.error('Exception using server client:', serverError);
      }
    }
    
    // Finally, try with admin client as fallback
    if (!profile) {
      try {
        const { data, error } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('external_auth_id', user.id)
          .single();
        
        if (!error) {
          console.log('Found profile using admin client');
          profile = data;
        } else if (error.code !== 'PGRST116') { // Only log non-not-found errors
          console.error('Error fetching user profile with admin client:', error);
        }
      } catch (adminError) {
        console.error('Exception using admin client:', adminError);
      }
    }
    
    return profile;
  } catch (error) {
    console.error('Exception in getCurrentUserProfile:', error);
    return null;
  }
}

// Reszta funkcji bez zmian

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
    
    // Próbujemy pobrać e-mail i dane
    let email = '';
    let firstName = '';
    let lastName = '';
    let imageUrl = null;
    
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      email = user.emailAddresses[0].emailAddress;
    }
    
    firstName = user.firstName || '';
    lastName = user.lastName || '';
    imageUrl = user.imageUrl || null;
    
    // W przeciwnym razie utwórz nowy profil
    const newProfile = {
      external_auth_id: user.id,
      display_name: firstName 
        ? `${firstName} ${lastName || ''}`.trim() 
        : (user.username || 'Nowy użytkownik'),
      email: email,
      phone_number: user.phoneNumbers && user.phoneNumbers[0]?.phoneNumber || null,
      profile_type: 'both',
      verification_level: 'basic',
      bio: '',
      avatar_url: imageUrl,
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
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    
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
    
    // Sprawdź, czy możemy pobrać token
    try {
      const authInstance = auth();
      if (!authInstance) {
        return false;
      }
      
      const token = await authInstance.getToken();
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