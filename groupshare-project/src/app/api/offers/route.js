import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseClient } from '../../../lib/supabase-client';

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
    
    // Anonimowy klient Supabase dla publicznych ofert
    const supabase = getSupabaseClient();
    
    // Start with base query
    let query = supabase
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
      `)
      .eq('status', 'active');
    
    // Apply filters
    if (filters.platformId) {
      query = query.eq('platform_id', filters.platformId);
    }
    
    if (filters.minPrice !== undefined) {
      query = query.gte('price_per_slot', filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      query = query.lte('price_per_slot', filters.maxPrice);
    }
    
    if (filters.availableSlots === true) {
      query = query.gt('slots_available', 0);
    }
    
    // Add ordering
    const orderBy = filters.orderBy || 'created_at';
    const ascending = filters.ascending === true;
    query = query.order(orderBy, { ascending });
    
    // Add pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json(data);
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
    
    // Uzyskaj token Supabase z sesji Clerk
    const supabaseToken = await user.getToken({ template: 'supabase' });
    const supabase = getSupabaseClient(supabaseToken);
    
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
    
    // Przygotowanie danych oferty
    const offerData = {
      group_id: body.groupId,
      platform_id: body.platformId,
      status: 'active',
      slots_total: body.slotsTotal,
      slots_available: body.slotsTotal,
      price_per_slot: body.pricePerSlot,
      currency: body.currency || 'PLN'
    };
    
    // Tworzenie oferty w Supabase z wykorzystaniem RLS
    const { data: offer, error: offerError } = await supabase
      .from('group_subs')
      .insert(offerData)
      .select()
      .single();
      
    if (offerError) {
      console.error('Error creating offer:', offerError);
      return NextResponse.json(
        { error: offerError.message || 'Failed to create offer' },
        { status: 500 }
      );
    }
    
    // Store access instructions
    try {
      const instructionsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/access-instructions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseToken}`
        },
        body: JSON.stringify({
          groupSubId: offer.id,
          instructions: body.accessInstructions
        })
      });
      
      if (!instructionsResponse.ok) {
        const errorData = await instructionsResponse.json();
        console.error('Failed to save access instructions:', errorData);
      }
    } catch (error) {
      console.error('Error saving access instructions:', error);
    }
    
    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription offer' }, 
      { status: 500 }
    );
  }
}