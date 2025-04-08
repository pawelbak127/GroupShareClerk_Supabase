export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  KeyManagementService, 
  InstructionEncryptionService, 
  TokenService,
  SecurityLogger,
  DeviceFingerprinter,
  AnomalyDetector
} from '@/lib/security';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/access/[id]
 * Pobiera instrukcje dostępowe za pomocą jednorazowego tokenu
 */
export async function GET(request, { params }) {
  try {
    const { id } = params; // ID zakupu
    
    // Pobierz token z URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Utwórz klienta Supabase z SSR
    const supabase = createServerSupabaseClient();

    // Inicjalizuj serwisy
    const tokenService = new TokenService();
    const keyManagementService = new KeyManagementService(process.env.ENCRYPTION_MASTER_KEY);
    const encryptionService = new InstructionEncryptionService(keyManagementService);
    const securityLogger = new SecurityLogger(user.id);
    const anomalyDetector = new AnomalyDetector();
    const deviceFingerprinter = new DeviceFingerprinter();
    
    // Generuj odcisk urządzenia
    const deviceFingerprint = deviceFingerprinter.generateFingerprint(request);
    
    // Sprawdź, czy nie ma podejrzanej aktywności
    const isSuspicious = await anomalyDetector.detectSuspiciousActivity(
      user.id, 
      'instruction_access',
      { ip: request.headers.get('x-forwarded-for') }
    );
    
    if (isSuspicious) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'warning',
        { reason: 'Suspicious activity detected' }
      );
      
      // Wciąż kontynuujemy, ale dodajemy wpis w logu
    }
    
    // Weryfikuj token
    const isValidToken = await tokenService.verifyToken(token, id);
    if (!isValidToken) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'Invalid or expired token' }
      );

      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Pobierz informacje o zakupie
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .select(`
        user_id,
        group_sub_id,
        status
      `)
      .eq('id', id)
      .single();

    if (purchaseError) {
      if (purchaseError.code === 'PGRST116') {
        await securityLogger.logSecurityEvent(
          'instruction_access',
          'purchase',
          id,
          'failure',
          { reason: 'Purchase record not found' }
        );
        
        return NextResponse.json(
          { error: 'Purchase record not found', code: purchaseError.code },
          { status: 404 }
        );
      } else {
        console.error('Error fetching purchase:', purchaseError);
        await securityLogger.logSecurityEvent(
          'instruction_access',
          'purchase',
          id,
          'failure',
          { reason: 'Database error', error: purchaseError.message, code: purchaseError.code }
        );
        
        return NextResponse.json(
          { error: purchaseError.message || 'Failed to fetch purchase record', code: purchaseError.code },
          { status: 500 }
        );
      }
    }

    if (!purchase) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'Purchase record not found but no error returned' }
      );
      
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik ma prawo dostępu
    if (purchase.user_id !== user.id) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'User not authorized for this purchase' }
      );

      return NextResponse.json(
        { error: 'You do not have permission to access these instructions' },
        { status: 403 }
      );
    }

    // Sprawdź, czy płatność została zakończona
    if (purchase.status !== 'completed') {
      return NextResponse.json(
        { error: 'Purchase not completed yet' },
        { status: 400 }
      );
    }

    // Pobierz zaszyfrowane instrukcje
    const { data: encryptedInstructions, error: instructionsError } = await supabase
      .from('access_instructions')
      .select(`
        encrypted_data,
        data_key_enc,
        encryption_key_id,
        iv,
        encryption_version
      `)
      .eq('group_sub_id', purchase.group_sub_id)
      .single();

    if (instructionsError) {
      // Szczegółowa obsługa błędów
      if (instructionsError.code === 'PGRST116') {
        await securityLogger.logSecurityEvent(
          'instruction_access',
          'purchase',
          id,
          'failure',
          { reason: 'Access instructions not found' }
        );
        
        return NextResponse.json(
          { error: 'Access instructions not found for this subscription', code: instructionsError.code },
          { status: 404 }
        );
      } else if (instructionsError.code === '42501') {
        await securityLogger.logSecurityEvent(
          'instruction_access',
          'purchase',
          id,
          'failure',
          { reason: 'Permission denied' }
        );
        
        return NextResponse.json(
          { error: 'You do not have permission to access these instructions', code: instructionsError.code },
          { status: 403 }
        );
      } else {
        console.error('Error fetching access instructions:', instructionsError);
        await securityLogger.logSecurityEvent(
          'instruction_access',
          'purchase',
          id,
          'failure',
          { reason: 'Database error', error: instructionsError.message, code: instructionsError.code }
        );
        
        return NextResponse.json(
          { error: 'Failed to retrieve access instructions', code: instructionsError.code },
          { status: 500 }
        );
      }
    }
    
    if (!encryptedInstructions) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'No instructions found but no error returned' }
      );
      
      return NextResponse.json(
        { error: 'Access instructions not found' },
        { status: 404 }
      );
    }

    // Odszyfruj instrukcje
    let decryptedInstructions;
    try {
      decryptedInstructions = await encryptionService.decryptInstructions({
        encryptedData: encryptedInstructions.encrypted_data,
        encryptedKey: encryptedInstructions.data_key_enc,
        keyId: encryptedInstructions.encryption_key_id,
        iv: encryptedInstructions.iv,
        version: encryptedInstructions.encryption_version
      });
    } catch (decryptError) {
      console.error('Error decrypting instructions:', decryptError);
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'Decryption error', error: decryptError.message }
      );
      
      return NextResponse.json(
        { error: 'Failed to decrypt access instructions' },
        { status: 500 }
      );
    }

    // Zaloguj udany dostęp
    await securityLogger.logSecurityEvent(
      'instruction_access',
      'purchase',
      id,
      'success'
    );

    // Zapisz odcisk urządzenia dla przyszłych weryfikacji
    await deviceFingerprinter.storeDeviceFingerprint(user.id, deviceFingerprint);

    // Aktualizuj status dostępu
    const { error: updateError } = await supabase
      .from('purchase_records')
      .update({
        access_provided: true,
        access_provided_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.warn('Error updating access status:', updateError);
      // Kontynuujemy mimo błędu, główna funkcjonalność została wykonana
    }

    return NextResponse.json({
      instructions: decryptedInstructions,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Instrukcje wygasają po 5 minutach
    });
  } catch (error) {
    console.error('Error accessing instructions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to access instructions' },
      { status: 500 }
    );
  }
}