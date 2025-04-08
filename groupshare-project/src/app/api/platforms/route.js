export const dynamic = 'force-dynamic';

// src/app/api/platforms/route.js
import { NextResponse } from 'next/server';
import supabase from '../../../lib/supabase-client';

/**
 * GET /api/platforms
 * Get available subscription platforms
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('subscription_platforms')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching platforms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch platforms' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in platforms API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}