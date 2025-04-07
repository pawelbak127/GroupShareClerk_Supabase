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
}

/**
 * Pobiera profil użytkownika Clerk i tworzy go jeśli nie istnieje
 */
export async function getOrCreateUserProfile() {
  const user = await currentUser();
  
  if (!user) return null;
  
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
    email: user.emailAddresses[0]?.emailAddress || '',
    phone_number: user.phoneNumbers[0]?.phoneNumber || null,
    profile_type: 'both',
    verification_level: 'basic',
    bio: '',
    avatar_url: user.imageUrl || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data: createdProfile, error: createError } = await supabaseAdmin
    .from('user_profiles')
    .insert([newProfile])
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating user profile:', createError);
    return null;
  }
  
  return createdProfile;
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