import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseClient } from '../../../lib/supabase-client';

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
    
    // Uzyskaj token Supabase z sesji Clerk
    const supabaseToken = await user.getToken({ template: 'supabase' });
    const supabase = getSupabaseClient(supabaseToken);

    // Pobierz grupy, których użytkownik jest członkiem (RLS automatycznie filtruje)
    const { data, error } = await supabase
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
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching groups:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch groups', code: error.code },
        { status: 500 }
      );
    }

    // Przekształć dane do bardziej przyjaznej struktury
    const groups = data.map(item => ({
      ...item.groups,
      role: item.role,
      isOwner: item.groups.owner_id === user.id
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
    
    // Uzyskaj token Supabase z sesji Clerk
    const supabaseToken = await user.getToken({ template: 'supabase' });
    const supabase = getSupabaseClient(supabaseToken);

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
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || '',
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      return NextResponse.json(
        { error: groupError.message || 'Failed to create group', code: groupError.code },
        { status: 500 }
      );
    }
    
    // Dodaj właściciela jako członka grupy
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
        status: 'active',
        invited_by: user.id,
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error adding member to group:', memberError);
      
      // Usuń grupę w przypadku błędu dodawania członka
      await supabase.from('groups').delete().eq('id', group.id);
      
      return NextResponse.json(
        { error: 'Failed to complete group creation process', code: memberError.code },
        { status: 500 }
      );
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