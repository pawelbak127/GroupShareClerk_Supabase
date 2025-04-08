export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getCurrentUserProfile } from '@/lib/auth-service';
import { getAuthenticatedSupabaseClient } from '@/lib/clerk-supabase';

/**
 * GET /api/groups
 * Pobiera grupy użytkownika
 */
export async function GET(request) {
  try {
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    const profile = await getCurrentUserProfile();

    // Pobierz grupy, których użytkownik jest członkiem
    const { data, error } = await supabaseAuth
      .from('group_members')
      .select(`
        status,
        role,
        groups(
          id,
          name,
          description,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', profile.id)
      .eq('status', 'active');

    if (error) {
      if (error.code === '42501') {
        console.error('Permission denied when fetching groups:', error);
        return NextResponse.json(
          { error: 'You do not have permission to access these groups', code: error.code },
          { status: 403 }
        );
      } else {
        console.error('Error fetching groups:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to fetch groups', code: error.code },
          { status: 500 }
        );
      }
    }

    // Sprawdź czy dane są prawidłowe
    if (!data) {
      console.warn('No data returned when fetching groups');
      return NextResponse.json(
        { error: 'Failed to fetch groups - no data returned' },
        { status: 500 }
      );
    }

    // Przekształć dane do bardziej przyjaznej struktury
    const groups = data.map(item => ({
      ...item.groups,
      role: item.role,
      isOwner: item.groups.owner_id === profile.id
    }));

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error in groups API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups
 * Tworzy nową grupę
 */
export async function POST(request) {
  try {
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get authenticated Supabase client
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    const profile = await getCurrentUserProfile();

    // Pobierz dane żądania
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Utwórz nową grupę
    const { data: group, error: groupError } = await supabaseAuth
      .from('groups')
      .insert({
        name,
        description: description || '',
        owner_id: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (groupError) {
      if (groupError.code === '23505') {
        console.warn('Duplicate group name:', groupError);
        return NextResponse.json(
          { error: 'A group with this name already exists', code: groupError.code },
          { status: 409 }
        );
      } else if (groupError.code === '42501') {
        console.error('Permission denied when creating group:', groupError);
        return NextResponse.json(
          { error: 'You do not have permission to create groups', code: groupError.code },
          { status: 403 }
        );
      } else if (groupError.code === '23502') {
        console.error('Missing required field for group:', groupError);
        return NextResponse.json(
          { error: 'Missing required field for group creation', code: groupError.code },
          { status: 400 }
        );
      } else {
        console.error('Error creating group:', groupError);
        return NextResponse.json(
          { error: groupError.message || 'Failed to create group', code: groupError.code },
          { status: 500 }
        );
      }
    }
    
    // Sprawdzenie czy grupa została utworzona
    if (!group) {
      console.warn('No group data returned after creation');
      return NextResponse.json(
        { error: 'Group was created but no data was returned' },
        { status: 500 }
      );
    }
    
    // Dodaj właściciela jako członka grupy
    const { error: memberError } = await supabaseAuth
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: profile.id,
        role: 'admin',
        status: 'active',
        invited_by: profile.id,
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      // Logowanie błędu, ale kontynuacja (nie blokujemy całego procesu)
      console.error('Error adding member to group:', memberError);
      
      // Jeśli wymagane jest zachowanie spójności, można rozważyć usunięcie grupy
      if (memberError.code === '23503' || memberError.code === '42501') {
        console.warn('Rolling back group creation due to member creation failure');
        await supabaseAuth.from('groups').delete().eq('id', group.id);
        
        return NextResponse.json(
          { error: 'Failed to complete group creation process', code: memberError.code },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error in create group API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}