export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';

/**
 * GET /api/auth/profile
 * Pobiera profil obecnie zalogowanego użytkownika, lub tworzy go jeśli nie istnieje
 */
export async function GET() {
  try {
    // Pobierz użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Fetching profile for user:', user.id);
    
    // Pobierz profil bezpośrednio używając supabaseAdmin (omijając RLS)
    let existingProfile = null;
    let profileError = null;
    
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('external_auth_id', user.id)
        .single();
        
      if (!error) {
        existingProfile = data;
        console.log('Found existing profile with admin client');
      } else if (error.code !== 'PGRST116') { // Ignore "not found" errors
        profileError = error;
        console.error('Error fetching profile with admin client:', error);
      }
    } catch (error) {
      console.error('Exception using admin client:', error);
      profileError = error;
    }
    
    // If profile exists, return it
    if (existingProfile) {
      return NextResponse.json(existingProfile);
    }
    
    // If profile not found, create it using admin client
    console.log('No profile found, creating a new one');
    
    const newProfile = {
      external_auth_id: user.id,
      display_name: user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : (user.username || 'Nowy użytkownik'),
      email: user.emailAddresses?.[0]?.emailAddress || '',
      phone_number: user.phoneNumbers?.[0]?.phoneNumber || null,
      profile_type: 'both',
      verification_level: 'basic',
      bio: '',
      avatar_url: user.imageUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Wstaw za pomocą supabaseAdmin, aby ominąć RLS
    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert([newProfile])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user profile:', createError);
      return NextResponse.json(
        { error: 'Failed to create user profile', details: createError },
        { status: 500 }
      );
    }
    
    console.log('Created new profile:', createdProfile.id);
    return NextResponse.json(createdProfile);
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/profile
 * Tworzy profil użytkownika, gdy nie został utworzony automatycznie
 */
export async function POST(request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Pobierz dane z żądania
    const profileData = await request.json();
    
    // Upewnij się, że external_auth_id jest zgodny z bieżącym użytkownikiem
    const userData = {
      ...profileData,
      external_auth_id: user.id // Wymuszenie poprawnego ID
    };
    
    // Sprawdź, czy profil już istnieje
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    if (existingProfile) {
      // Zaktualizuj istniejący profil
      const { data: updatedProfile, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          display_name: userData.display_name,
          email: userData.email,
          phone_number: userData.phone_number,
          bio: userData.bio,
          avatar_url: userData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
          { error: 'Failed to update profile', details: error },
          { status: 500 }
        );
      }
      
      return NextResponse.json(updatedProfile);
    }
    
    // Utwórz nowy profil
    const newProfile = {
      external_auth_id: user.id,
      display_name: userData.display_name || 'Nowy użytkownik',
      email: userData.email || '',
      phone_number: userData.phone_number || null,
      profile_type: userData.profile_type || 'both',
      verification_level: userData.verification_level || 'basic',
      bio: userData.bio || '',
      avatar_url: userData.avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Wstaw profil za pomocą supabaseAdmin, aby ominąć RLS
    const { data: createdProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .insert([newProfile])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating profile:', error);
      return NextResponse.json(
        { error: 'Failed to create profile', details: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json(createdProfile);
  } catch (error) {
    console.error('Error in create profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}