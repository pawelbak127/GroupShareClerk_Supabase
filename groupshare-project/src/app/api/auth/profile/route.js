import { NextResponse } from 'next/server';
import { getOrCreateUserProfile } from '../../../../lib/auth-service';

/**
 * GET /api/auth/profile
 * Pobiera profil obecnie zalogowanego użytkownika, lub tworzy go jeśli nie istnieje
 */
export async function GET() {
  try {
    const userProfile = await getOrCreateUserProfile();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}