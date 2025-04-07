import { currentUser } from '@clerk/nextjs/server';
import supabase from './supabase-client';
import supabaseAdmin from './supabase-admin-client';
import { getAuthenticatedSupabaseClient } from './clerk-supabase';
import { createClient } from '@supabase/supabase-js';

// Bezpośrednie użycie klienta na potrzeby debugowania
const debugDirectClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Brakuje zmiennych środowiskowych dla Supabase');
    return null;
  }
  
  console.log("Tworzenie bezpośredniego klienta z kluczem serwisowym");
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Pobiera aktualny profil użytkownika z bazy danych
 */
export async function getCurrentUserProfile() {
  const user = await currentUser();
  
  if (!user) return null;
  
  try {
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    
    const { data, error } = await supabaseAuth
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
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
    
    console.log("Tworzenie nowego profilu dla użytkownika:", user.id);
    
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
    
    // ROZWIĄZANIE TYMCZASOWE: Użyj bezpośredniego klienta z kluczem serwisowym
    const directClient = debugDirectClient();
    
    if (directClient) {
      try {
        console.log("Próba użycia bezpośredniego klienta do utworzenia profilu");
        const { data: createdProfile, error: createError } = await directClient
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating user profile with direct client:', createError);
        } else if (createdProfile) {
          console.log("Profil użytkownika utworzony pomyślnie z użyciem bezpośredniego klienta");
          return createdProfile;
        }
      } catch (directError) {
        console.error('Exception when using direct client:', directError);
      }
    }
    
    // Standardowa metoda, jako fallback
    try {
      const { data: createdProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user profile with supabaseAdmin:', createError);
        
        // OBEJŚCIE: Jeśli mamy problemy z uprawnieniami, zwróć tymczasowy profil
        if (createError.code === '42501') {
          console.warn('Returning temporary profile due to permissions issue');
          return {
            ...newProfile,
            id: 'temp_' + Math.random().toString(36).substr(2, 9),
            _isTemporaryProfile: true
          };
        }
        
        return null;
      }
      
      return createdProfile;
    } catch (createError) {
      console.error('Exception when creating user profile with supabaseAdmin:', createError);
      return null;
    }
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    return null;
  }
}

/**
 * Sprawdza, czy użytkownik jest właścicielem grupy
 */
export async function isGroupOwner(groupId) {
  const user = await currentUser();
  if (!user) return false;
  
  const supabaseAuth = await getAuthenticatedSupabaseClient(user);
  
  const { data } = await supabaseAuth
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();
  
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  
  return data?.owner_id === profile.id;
}

/**
 * Sprawdza, czy użytkownik jest administratorem grupy
 */
export async function isGroupAdmin(groupId) {
  // Sprawdzenie, czy jest właścicielem
  if (await isGroupOwner(groupId)) return true;
  
  const user = await currentUser();
  if (!user) return false;
  
  const supabaseAuth = await getAuthenticatedSupabaseClient(user);
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  
  // Sprawdzenie, czy jest adminem
  const { data } = await supabaseAuth
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .single();
  
  return data?.role === 'admin';
}

/**
 * Sprawdza, czy użytkownik ma uprawnienia do oferty subskrypcji
 */
export async function hasSubscriptionOfferAccess(offerId) {
  const user = await currentUser();
  if (!user) return false;
  
  const supabaseAuth = await getAuthenticatedSupabaseClient(user);
  
  const { data: offer } = await supabaseAuth
    .from('group_subs')
    .select('group_id')
    .eq('id', offerId)
    .single();
  
  if (!offer) return false;
  
  return await isGroupAdmin(offer.group_id);
}

/**
 * Sprawdza, czy użytkownik jest właścicielem zakupu
 */
export async function isPurchaseOwner(purchaseId) {
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  
  const user = await currentUser();
  if (!user) return false;
  
  const supabaseAuth = await getAuthenticatedSupabaseClient(user);
  
  const { data } = await supabaseAuth
    .from('purchase_records')
    .select('user_id')
    .eq('id', purchaseId)
    .single();
  
  return data?.user_id === profile.id;
}