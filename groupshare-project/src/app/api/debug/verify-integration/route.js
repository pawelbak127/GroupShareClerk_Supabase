export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAuthenticatedSupabaseClient } from '@/lib/clerk-supabase';

/**
 * GET /api/debug/verify-integration
 * Endpoint do weryfikacji poprawności integracji Clerk-Supabase
 */
export async function GET(request) {
  // Ten endpoint powinien być dostępny tylko w środowisku deweloperskim
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Ten endpoint jest dostępny tylko w trybie developerskim' },
      { status: 403 }
    );
  }
  
  try {
    // Pobierz aktualnego użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nie jesteś zalogowany w Clerk' },
        { status: 401 }
      );
    }
    
    // Pobierz token z Clerk - zgodnie z nową integracją
    let token, tokenError;
    try {
      // Użyj sesji zamiast bezpośrednio user.getToken()
      const userSession = await user.getSession();
      token = userSession ? await userSession.getToken() : null;
    } catch (error) {
      tokenError = error.message;
    }
    
    // Utwórz klienta Supabase na serwerze
    const supabaseServer = createServerSupabaseClient();
    
    // Utwórz uwierzytelnionego klienta Supabase
    const supabaseAuth = await getAuthenticatedSupabaseClient(user);
    
    // Sprawdź, czy funkcja auth.clerk_user_id() działa
    let clerkUserId, clerkUserIdError;
    try {
      const { data, error } = await supabaseAdmin.rpc('get_auth_status');
      if (error) {
        clerkUserIdError = error.message;
      } else {
        clerkUserId = data;
      }
    } catch (error) {
      clerkUserIdError = error.message;
    }
    
    // Sprawdź czy użytkownik ma profil w Supabase
    let userProfile, userProfileError;
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('external_auth_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        userProfileError = error.message;
      } else {
        userProfile = data;
      }
    } catch (error) {
      userProfileError = error.message;
    }
    
    // Sprawdź, czy możemy uzyskać dostęp do tabeli user_profiles za pomocą uwierzytelnionego klienta
    let userProfileAccess, userProfileAccessError;
    try {
      const { data, error } = await supabaseAuth
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (error) {
        userProfileAccessError = error.message;
      } else {
        userProfileAccess = data;
      }
    } catch (error) {
      userProfileAccessError = error.message;
    }
    
    // Testuj zapytania do innych tabel (groups, group_subs)
    let groupsAccess, groupsAccessError;
    try {
      const { data, error } = await supabaseAuth
        .from('groups')
        .select('*')
        .limit(1);
      
      if (error) {
        groupsAccessError = error.message;
      } else {
        groupsAccess = data;
      }
    } catch (error) {
      groupsAccessError = error.message;
    }
    
    // Testuj zapytania do tabeli user_profiles z supabaseAdmin
    let adminUserProfileAccess, adminUserProfileAccessError;
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (error) {
        adminUserProfileAccessError = error.message;
      } else {
        adminUserProfileAccess = data;
      }
    } catch (error) {
      adminUserProfileAccessError = error.message;
    }
    
    // Włącz tryb deweloperski w Supabase (opcjonalnie)
    let devModeStatus = "not_attempted";
    try {
      const { data, error } = await supabaseAdmin.rpc('enable_development_mode', { enable: true });
      if (error) {
        devModeStatus = `error: ${error.message}`;
      } else {
        devModeStatus = data ? "enabled" : "failed";
      }
    } catch (error) {
      devModeStatus = `exception: ${error.message}`;
    }
    
    return NextResponse.json({
      integration_status: {
        clerk_user: user ? 'ok' : 'error',
        jwt_token: token ? 'ok' : 'error',
        supabase_client: supabaseServer ? 'ok' : 'error',
        supabase_auth_client: supabaseAuth ? 'ok' : 'error',
        dev_mode: devModeStatus
      },
      clerk: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddresses: user.emailAddresses,
          imageUrl: user.imageUrl
        }
      },
      jwt: {
        token: token ? `${token.substring(0, 10)}...` : null, // Tylko początek tokenu
        error: tokenError || null
      },
      supabase: {
        user_profile: {
          exists: userProfile ? true : false,
          error: userProfileError || null
        },
        access_tests: {
          user_profiles: {
            authenticated: userProfileAccess ? 'ok' : 'failed',
            error: userProfileAccessError || null,
            count: userProfileAccess?.length || 0
          },
          groups: {
            authenticated: groupsAccess ? 'ok' : 'failed',
            error: groupsAccessError || null,
            count: groupsAccess?.length || 0
          },
          admin_access: {
            user_profiles: {
              authenticated: adminUserProfileAccess ? 'ok' : 'failed',
              error: adminUserProfileAccessError || null,
              count: adminUserProfileAccess?.length || 0
            }
          }
        },
        auth_status: clerkUserId,
        auth_status_error: clerkUserIdError || null
      }
    });
  } catch (error) {
    console.error('Błąd w API weryfikacji integracji:', error);
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd', details: error.message },
      { status: 500 }
    );
  }
}