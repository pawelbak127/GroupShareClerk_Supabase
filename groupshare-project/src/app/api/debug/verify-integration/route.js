export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
    const authObject = auth();
    let token, tokenError;
    
    try {
      if (authObject) {
        token = await authObject.getToken();
      } else {
        tokenError = "No auth object available";
      }
    } catch (error) {
      tokenError = error.message;
    }
    
    // Utwórz klienta Supabase na serwerze
    const supabaseServer = await createServerSupabaseClient();
    
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
    
    // Testuj wykonanie funkcji SQL w Supabase
    let sqlFunctionResult, sqlFunctionError;
    try {
      const { data, error } = await supabaseAdmin.rpc('ensure_role_in_jwt_claims');
      if (error) {
        sqlFunctionError = error.message;
      } else {
        sqlFunctionResult = data;
      }
    } catch (error) {
      sqlFunctionError = error.message;
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
    
    // Sprawdź zawartość tokenu
    let tokenDetails = null;
    if (token) {
      try {
        // Dekoduj JWT (tylko do celów diagnostycznych)
        const [header, payload, signature] = token.split('.');
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        tokenDetails = {
          header: JSON.parse(Buffer.from(header, 'base64').toString()),
          payload: {
            ...decodedPayload,
            // Nie pokazuj pełnej zawartości tokenu ze względów bezpieczeństwa
            sub: decodedPayload.sub ? `${decodedPayload.sub.substring(0, 8)}...` : null
          }
        };
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    
    // Sprawdź konfigurację zmiennych środowiskowych
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
      NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'set' : 'missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'set' : 'missing',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'set' : 'missing'
    };
    
    return NextResponse.json({
      integration_status: {
        clerk_user: user ? 'ok' : 'error',
        jwt_token: token ? 'ok' : 'error',
        supabase_client: supabaseServer ? 'ok' : 'error',
        dev_mode: devModeStatus
      },
      environment: envVars,
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
        error: tokenError || null,
        details: tokenDetails
      },
      supabase: {
        user_profile: {
          exists: userProfile ? true : false,
          error: userProfileError || null
        },
        admin_access: {
          user_profiles: {
            authenticated: adminUserProfileAccess ? 'ok' : 'failed',
            error: adminUserProfileAccessError || null,
            count: adminUserProfileAccess?.length || 0
          }
        },
        sql_function: {
          result: sqlFunctionResult,
          error: sqlFunctionError
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