import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserProfile } from '../../../../lib/auth-service';
import { getAuthenticatedSupabaseClient } from '../../../../lib/clerk-supabase';

/**
 * GET /api/auth/profile
 * Pobiera profil obecnie zalogowanego użytkownika, lub tworzy go jeśli nie istnieje
 */
export async function GET() {
  try {
    // Użyj funkcji z auth-service
    const userProfile = await getOrCreateUserProfile();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/profile
 * Aktualizuje profil zalogowanego użytkownika
 */
export async function PATCH(request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Pobierz profil użytkownika
    const userProfile = await getOrCreateUserProfile();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // Pobierz dane z żądania
    const updates = await request.json();
    
    // Zablokuj modyfikację pól, których użytkownik nie powinien móc zmienić
    const forbiddenFields = ['id', 'external_auth_id', 'email', 'verification_level', 'rating_avg', 'rating_count', 'created_at'];
    
    for (const field of forbiddenFields) {
      if (field in updates) {
        delete updates[field];
      }
    }
    
    // Get authenticated Supabase client
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    
    // Aktualizuj profil
    const { data: updated, error: updateError } = await supabaseAuth
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}