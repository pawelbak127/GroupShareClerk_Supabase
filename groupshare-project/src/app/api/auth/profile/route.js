import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseClient } from '../../../../lib/supabase-client'

/**
 * GET /api/auth/profile
 * Pobiera profil obecnie zalogowanego użytkownika lub zwraca dane Clerk bez synchronizacji
 */
export async function GET() {
  try {
    // Pobierz dane zalogowanego użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Pobierz token Supabase z sesji Clerk
    const supabaseToken = await user.getToken({ template: 'supabase' });
    
    // Utwórz klienta Supabase z tokenem sesji
    const supabase = getSupabaseClient(supabaseToken);
    
    // Pobierz profil użytkownika bezpośrednio przez RLS - Supabase automatycznie 
    // uwzględni ID użytkownika na podstawie tokena
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', user.id)
      .single();
    
    // Jeśli profil nie istnieje, zwróć podstawowe dane z Clerk bez tworzenia profilu
    // Profil zostanie utworzony przez trigger bazodanowy lub politykę RLS
    if (error || !userProfile) {
      // Zwróć podstawowe dane użytkownika z Clerk
      return NextResponse.json({
        id: user.id,
        display_name: user.firstName 
          ? `${user.firstName} ${user.lastName || ''}`.trim() 
          : (user.username || 'Nowy użytkownik'),
        email: user.emailAddresses[0]?.emailAddress || '',
        avatar_url: user.imageUrl || null,
        is_new_user: true
      });
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
    // Pobierz dane zalogowanego użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Pobierz token Supabase z sesji Clerk
    const supabaseToken = await user.getToken({ template: 'supabase' });
    
    // Utwórz klienta Supabase z tokenem sesji
    const supabase = getSupabaseClient(supabaseToken);
    
    // Pobierz dane z żądania
    const updates = await request.json();
    
    // Zablokuj modyfikację pól, których użytkownik nie powinien móc zmienić
    const forbiddenFields = ['id', 'external_auth_id', 'email', 'verification_level', 'rating_avg', 'rating_count', 'created_at'];
    
    for (const field of forbiddenFields) {
      if (field in updates) {
        delete updates[field];
      }
    }
    
    // Aktualizuj profil - Supabase automatycznie ograniczy dostęp poprzez RLS
    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('external_auth_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile', details: error },
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