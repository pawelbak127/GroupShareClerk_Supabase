export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabase from '../../../../lib/supabase-client';
import supabaseAdmin from '../../../../lib/supabase-admin-client';

/**
 * GET /api/purchases/[id]
 * Pobiera szczegóły zakupu
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log(`Pobieranie szczegółów zakupu ${id} dla użytkownika ${user.id}`);
    
    // Pobierz profil użytkownika
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify user profile', details: profileError },
        { status: 500 }
      );
    }
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Pobierz dane zakupu wraz z powiązanymi informacjami
    // Zmiana: Użyj supabaseAdmin zamiast supabase, aby ominąć RLS
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchase_records')
      .select(`
        *,
        group_sub:group_subs(
          *,
          subscription_platforms(
            id,
            name,
            icon
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (purchaseError) {
      console.error('Error fetching purchase details:', purchaseError);
      return NextResponse.json(
        { error: 'Purchase record not found', details: purchaseError },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy zakup należy do użytkownika
    if (purchase.user_id !== userProfile.id) {
      console.warn(`Attempted unauthorized access to purchase ${id} by user ${userProfile.id}`);
      return NextResponse.json(
        { error: 'You do not have permission to view this purchase' },
        { status: 403 }
      );
    }
    
    console.log(`Szczegóły zakupu pobrane pomyślnie`);
    return NextResponse.json(purchase);
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase details', details: error.message },
      { status: 500 }
    );
  }
}