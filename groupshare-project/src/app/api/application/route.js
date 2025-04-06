import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth-service';
import supabase from '../../../lib/supabase-client';

/**
 * GET /api/applications
 * Pobiera aplikacje użytkownika
 */
export async function GET(request) {
  try {
    // Pobierz profil użytkownika
    const userProfile = await getCurrentUserProfile();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pobierz parametry z URL
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active') === 'true';

    // Zapytanie do bazy danych
    let query = supabase
      .from('applications')
      .select(`
        *,
        group_sub:group_subs(
          id, 
          price_per_slot,
          currency,
          subscription_platforms(id, name, icon)
        ),
        seller:group_subs(
          groups(
            owner_id, 
            user_profiles!inner(id, display_name, avatar_url)
          )
        )
      `)
      .eq('user_id', userProfile.id);

    // Filtruj aktywne aplikacje
    if (active) {
      query = query.in('status', ['pending', 'accepted', 'completed']);
    }
    
    // Sortuj
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications', code: error.code },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in applications API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}