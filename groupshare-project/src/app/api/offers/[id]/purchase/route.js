import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabase from '../../../../../lib/supabase-client';
import { getOrCreateUserProfile } from '../../../../../lib/auth-service';

/**
 * POST /api/offers/[id]/purchase
 * Inicjuje zakup subskrypcji z natychmiastowym dostępem
 */
export async function POST(request, { params }) {
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
    
    // Pobierz lub utwórz profil użytkownika za pomocą standardowej funkcji
    const userProfile = await getOrCreateUserProfile();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Failed to get or create user profile' },
        { status: 500 }
      );
    }
    
    // Sprawdź ofertę i dostępność miejsc
    const { data: offer, error: offerError } = await supabase
      .from('group_subs')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();
    
    if (offerError) {
      console.error('Error fetching offer:', offerError);
      return NextResponse.json(
        { error: 'Offer not found', details: offerError },
        { status: 404 }
      );
    }
    
    if (!offer || offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'Offer not available or no slots left' },
        { status: 400 }
      );
    }
    
    // Utwórz rekord zakupu
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .insert({
        user_id: userProfile.id,
        group_sub_id: id,
        status: 'pending_payment'
      })
      .select()
      .single();
      
    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError);
      return NextResponse.json(
        { error: 'Failed to create purchase record', details: purchaseError },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error initiating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to initiate purchase', details: error.message },
      { status: 500 }
    );
  }
}