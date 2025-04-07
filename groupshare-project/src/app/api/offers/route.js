import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getCurrentUserProfile } from '@/lib/auth-service';
import { getAuthenticatedSupabaseClient } from '@/lib/clerk-supabase';
import { getSubscriptionOffers } from '@/lib/supabase-client';

/**
 * GET /api/offers
 * Get subscription offers with optional filtering
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters = {
      platformId: searchParams.get('platformId') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : undefined,
      availableSlots: searchParams.get('availableSlots') !== 'false', // Default to true
      orderBy: searchParams.get('orderBy') || 'created_at',
      ascending: searchParams.get('ascending') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 10,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')) : 0
    };
    
    // Get subscription offers with filters
    const offers = await getSubscriptionOffers(filters);
    
    // Return the offers
    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription offers', code: error.code || 'unknown' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/offers
 * Create a new subscription offer
 */
export async function POST(request) {
  try {
    // Verify user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    const profile = await getCurrentUserProfile();
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['groupId', 'platformId', 'slotsTotal', 'pricePerSlot', 'accessInstructions'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate numeric fields
    if (isNaN(parseFloat(body.pricePerSlot)) || parseFloat(body.pricePerSlot) <= 0) {
      return NextResponse.json(
        { error: 'Price per slot must be a positive number' },
        { status: 400 }
      );
    }
    
    if (!Number.isInteger(body.slotsTotal) || body.slotsTotal <= 0) {
      return NextResponse.json(
        { error: 'Slots total must be a positive integer' },
        { status: 400 }
      );
    }
    
    // Verify user is the owner or admin of the group using RLS
    // Since we're using authenticated Supabase client, policies will enforce this
    
    // Prepare the offer data
    const offerData = {
      group_id: body.groupId,
      platform_id: body.platformId,
      status: 'active',
      slots_total: body.slotsTotal,
      slots_available: body.slotsTotal,
      price_per_slot: body.pricePerSlot,
      currency: body.currency || 'PLN',
      instant_access: true // All offers now have instant access
    };
    
    // Create the offer in Supabase
    const { data: createdOffer, error } = await supabaseAuth
      .from('group_subs')
      .insert(offerData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating offer:', error);
      
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'You do not have permission to create offers for this group' },
          { status: 403 }
        );
      } else if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Group or platform not found' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: error.message || 'Failed to create subscription offer' },
          { status: 500 }
        );
      }
    }
    
    // Check result
    if (!createdOffer || !createdOffer.id) {
      console.warn('Offer creation response missing ID');
      return NextResponse.json(
        { error: 'Offer was created but returned invalid data' },
        { status: 500 }
      );
    }
    
    // Store access instructions
    try {
      const instructionsResponse = await supabaseAuth
        .from('access_instructions')
        .insert({
          group_sub_id: createdOffer.id,
          instructions: body.accessInstructions,
          updated_at: new Date().toISOString()
        });
      
      if (instructionsResponse.error) {
        console.error('Failed to save access instructions:', instructionsResponse.error);
      }
    } catch (error) {
      console.error('Error saving access instructions:', error);
    }
    
    return NextResponse.json(createdOffer, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription offer' }, 
      { status: 500 }
    );
  }
}