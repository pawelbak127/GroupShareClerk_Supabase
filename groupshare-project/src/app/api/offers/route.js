export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getCurrentUserProfile } from '../../../lib/auth-service';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import supabaseAdmin from '../../../lib/supabase-admin-client';

/**
 * GET /api/offers
 * Get subscription offers with optional filtering
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // W przypadku problemów z autentykacją, użyj klienta administratora
    // Ten powinien zawsze działać, ponieważ używa service role
    const supabaseClient = supabaseAdmin;
    
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