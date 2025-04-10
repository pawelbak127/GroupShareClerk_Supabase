export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getCurrentUserProfile } from '../../../lib/auth-service';
import supabaseAdmin from '../../../lib/supabase-admin-client';

/**
 * GET /api/offers
 * Get subscription offers with optional filtering
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Używaj bezpośrednio supabaseAdmin zamiast prób z wieloma klientami
    let supabaseClient = supabaseAdmin;
    
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
    
    // Przygotowanie zapytania
    let query = supabaseClient
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name, description),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
      `)
      .eq('status', 'active');
    
    // Dodaj filtr na platformę
    if (filters.platformId) {
      query = query.eq('platform_id', filters.platformId);
    }
    
    // Dodaj filtr na cenę minimalną
    if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
      query = query.gte('price_per_slot', filters.minPrice);
    }
    
    // Dodaj filtr na cenę maksymalną
    if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
      query = query.lte('price_per_slot', filters.maxPrice);
    }
    
    // Filtruj oferty tylko z dostępnymi miejscami
    if (filters.availableSlots !== false) {
      query = query.gt('slots_available', 0);
    }
    
    // Sortowanie
    const orderBy = filters.orderBy || 'created_at';
    const ascending = filters.ascending || false;
    query = query.order(orderBy, { ascending });
    
    // Limit i paginacja
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    try {
      // Wykonaj zapytanie
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching subscription offers:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to fetch subscription offers', code: error.code || 'unknown' }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json(data || []);
    } catch (queryError) {
      console.error('Exception executing query:', queryError);
      return NextResponse.json(
        { error: 'Failed to execute database query', details: queryError.message }, 
        { status: 500 }
      );
    }
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
    
    // Get user profile using admin client
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
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
    
    // Verify if user owns the group using admin client
    try {
      const { data: groupData, error: groupError } = await supabaseAdmin
        .from('groups')
        .select('owner_id')
        .eq('id', body.groupId)
        .single();
      
      if (groupError) {
        return NextResponse.json(
          { error: 'Group not found or you do not have permission', details: groupError.message },
          { status: 403 }
        );
      }
      
      if (groupData.owner_id !== profile.id) {
        return NextResponse.json(
          { error: 'You do not have permission to create offers for this group' },
          { status: 403 }
        );
      }
    } catch (groupCheckError) {
      console.error('Error checking group ownership:', groupCheckError);
      return NextResponse.json(
        { error: 'Failed to verify group ownership', details: groupCheckError.message },
        { status: 500 }
      );
    }
    
    // Create offer with admin client
    let createdOffer;
    try {
      const { data, error } = await supabaseAdmin
        .from('group_subs')
        .insert(offerData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating offer:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to create subscription offer', code: error.code },
          { status: 500 }
        );
      }
      
      createdOffer = data;
    } catch (createError) {
      console.error('Exception creating offer:', createError);
      return NextResponse.json(
        { error: 'Exception while creating offer', details: createError.message },
        { status: 500 }
      );
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
      const { error: instructionsError } = await supabaseAdmin
        .from('access_instructions')
        .insert({
          group_sub_id: createdOffer.id,
          instructions: body.accessInstructions,
          updated_at: new Date().toISOString()
        });
      
      if (instructionsError) {
        console.error('Failed to save access instructions:', instructionsError);
      }
    } catch (instructionsError) {
      console.error('Error saving access instructions:', instructionsError);
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