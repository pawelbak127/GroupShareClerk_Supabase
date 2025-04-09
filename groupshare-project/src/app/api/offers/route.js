export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';
import { getCurrentUserProfile } from '../../../lib/auth-service';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { getAuthenticatedSupabaseClient } from '../../../lib/clerk-supabase';
import supabaseAdmin from '../../../lib/supabase-admin-client';

/**
 * GET /api/offers
 * Get subscription offers with optional filtering
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Try multiple approaches to get Supabase client with auth
    let supabaseClient;
    
    // First try to get authenticated client with current user
    try {
      const user = await currentUser();
      if (user) {
        supabaseClient = await getAuthenticatedSupabaseClient(user);
        console.log("Using authenticated client with currentUser");
      }
    } catch (e) {
      console.warn("Failed to get authenticated client with currentUser:", e.message);
    }
    
    // If that failed, try with createServerSupabaseClient
    if (!supabaseClient) {
      try {
        supabaseClient = createServerSupabaseClient();
        console.log("Using server Supabase client");
      } catch (e) {
        console.warn("Failed to create server Supabase client:", e.message);
      }
    }
    
    // Fallback to admin client if all else fails
    if (!supabaseClient) {
      console.log("Falling back to admin client");
      supabaseClient = supabaseAdmin;
    }
    
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
    
    // Wykonaj zapytanie
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching subscription offers:', error);
      
      // If authentication error, try with admin client
      if (error.code === '42501' && supabaseClient !== supabaseAdmin) {
        console.log('Permission denied, trying with admin client');
        
        // Create the same query with admin client
        let adminQuery = supabaseAdmin
          .from('group_subs')
          .select(`
            *,
            subscription_platforms(*),
            groups(id, name, description),
            owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
          `)
          .eq('status', 'active');
        
        // Add the same filters
        if (filters.platformId) {
          adminQuery = adminQuery.eq('platform_id', filters.platformId);
        }
        
        if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
          adminQuery = adminQuery.gte('price_per_slot', filters.minPrice);
        }
        
        if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
          adminQuery = adminQuery.lte('price_per_slot', filters.maxPrice);
        }
        
        if (filters.availableSlots !== false) {
          adminQuery = adminQuery.gt('slots_available', 0);
        }
        
        // Sorting
        adminQuery = adminQuery.order(orderBy, { ascending });
        
        // Limit and pagination
        if (filters.limit) {
          adminQuery = adminQuery.limit(filters.limit);
        }
        
        if (filters.offset) {
          adminQuery = adminQuery.offset(filters.offset);
        }
        
        // Execute admin query
        const { data: adminData, error: adminError } = await adminQuery;
        
        if (adminError) {
          console.error('Error with admin client too:', adminError);
          return NextResponse.json(
            { 
              error: error.message || 'Failed to fetch subscription offers', 
              code: error.code || 'unknown', 
              details: "Both regular and admin client failed"
            }, 
            { status: 500 }
          );
        }
        
        return NextResponse.json(adminData || []);
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to fetch subscription offers', code: error.code || 'unknown' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(data || []);
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
    
    // Get authenticated client
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
    
    let createdOffer;
    
    try {
      // Create the offer in Supabase with auth client
      const { data, error } = await supabaseAuth
        .from('group_subs')
        .insert(offerData)
        .select()
        .single();
      
      if (error) throw error;
      createdOffer = data;
    } catch (authError) {
      console.error('Error creating offer with auth client:', authError);
      
      // If auth client fails, try with admin client
      if (authError.code === '42501') { // Permission denied
        console.log('Permission denied, trying with admin client');
        
        // Verify if user owns the group first
        const { data: groupData, error: groupError } = await supabaseAdmin
          .from('groups')
          .select('owner_id')
          .eq('id', body.groupId)
          .single();
        
        if (groupError) {
          return NextResponse.json(
            { error: 'Group not found or you do not have permission' },
            { status: 403 }
          );
        }
        
        if (groupData.owner_id !== profile.id) {
          return NextResponse.json(
            { error: 'You do not have permission to create offers for this group' },
            { status: 403 }
          );
        }
        
        // Create offer with admin client
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('group_subs')
          .insert(offerData)
          .select()
          .single();
        
        if (adminError) {
          console.error('Error creating offer with admin client:', adminError);
          return NextResponse.json(
            { error: adminError.message || 'Failed to create subscription offer' },
            { status: 500 }
          );
        }
        
        createdOffer = adminData;
      } else {
        // For other errors, return the original error
        return NextResponse.json(
          { 
            error: authError.message || 'Failed to create subscription offer',
            code: authError.code
          },
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
      const instructionsResponse = await supabaseAdmin
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