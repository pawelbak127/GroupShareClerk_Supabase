import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAuthenticatedSupabaseClient } from '@/lib/clerk-supabase';

/**
 * GET /api/offers/[id]
 * Get details of a specific subscription offer
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Using standard supabase client for public data
    const user = await currentUser();
    const supabaseClient = user 
      ? await getAuthenticatedSupabaseClient(user) 
      : supabase;

    const { data: offer, error } = await supabaseClient
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name, description),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level, bio))
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription offer' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/offers/[id]
 * Update a subscription offer
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const updates = await request.json();

    // Get authenticated Supabase client
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);

    // Get original offer to check permissions
    const { data: offer, error: offerError } = await supabaseAuth
      .from('group_subs')
      .select(`
        *,
        groups!inner(id, owner_id)
      `)
      .eq('id', id)
      .single();

    if (offerError) {
      console.error('Error fetching offer:', offerError);
      return NextResponse.json(
        { error: 'Subscription offer not found or access denied', code: offerError.code },
        { status: offerError.code === 'PGRST116' ? 404 : 403 }
      );
    }
    
    // Prepare update data
    const updateData = {
      status: updates.status || offer.status,
      price_per_slot: updates.pricePerSlot || offer.price_per_slot,
      slots_total: updates.slotsTotal || offer.slots_total,
      slots_available: updates.slotsAvailable !== undefined ? updates.slotsAvailable : offer.slots_available,
      currency: updates.currency || offer.currency,
      instant_access: true // Always true in new model
    };

    // Update offer with authenticated client
    const { data: updatedOffer, error: updateError } = await supabaseAuth
      .from('group_subs')
      .update(updateData)
      .eq('id', id)
      .select();
      
    if (updateError) {
      console.error('Error updating offer:', updateError);
      return NextResponse.json(
        { error: 'Failed to update offer', details: updateError },
        { status: 500 }
      );
    }

    // Optional: Update access instructions if provided
    if (updates.accessInstructions) {
      const { error: instructionsError } = await supabaseAuth
        .from('access_instructions')
        .upsert({
          group_sub_id: id,
          instructions: updates.accessInstructions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'group_sub_id'
        });

      if (instructionsError) {
        console.warn('Error updating access instructions:', instructionsError);
      }
    }

    return NextResponse.json(updatedOffer);
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription offer' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/offers/[id]
 * Delete a subscription offer
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get authenticated Supabase client
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);

    // Verify access rights through RLS
    const { data: offer, error: offerError } = await supabaseAuth
      .from('group_subs')
      .select(`
        *,
        groups!inner(id, owner_id)
      `)
      .eq('id', id)
      .single();

    if (offerError) {
      console.error('Error fetching offer:', offerError);
      return NextResponse.json(
        { error: 'Subscription offer not found or access denied', code: offerError.code },
        { status: offerError.code === 'PGRST116' ? 404 : 403 }
      );
    }

    // Delete the offer with authenticated client
    const { error: deleteError } = await supabaseAuth
      .from('group_subs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting offer:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete offer', details: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Subscription offer deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription offer' },
      { status: 500 }
    );
  }
}