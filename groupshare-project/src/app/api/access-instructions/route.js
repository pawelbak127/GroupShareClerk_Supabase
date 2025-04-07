import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAuthenticatedSupabaseClient } from '@/lib/clerk-supabase';
import { getCurrentUserProfile } from '@/lib/auth-service';
import { 
  KeyManagementService, 
  InstructionEncryptionService,
  SecurityLogger 
} from '@/lib/security';

/**
 * POST /api/access-instructions
 * Zapisuje zaszyfrowane instrukcje dostępowe dla oferty subskrypcji
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

    // Parsuj dane żądania
    const body = await request.json();
    const { groupSubId, instructions } = body;

    if (!groupSubId || !instructions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sprawdź, czy użytkownik ma uprawnienia do tej oferty
    const { data: offer, error: offerError } = await supabaseAuth
      .from('group_subs')
      .select(`
        groups!inner(owner_id)
      `)
      .eq('id', groupSubId)
      .single();

    if (offerError) {
      if (offerError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Subscription offer not found', code: offerError.code },
          { status: 404 }
        );
      } else {
        console.error('Error fetching offer for access instructions:', offerError);
        return NextResponse.json(
          { error: offerError.message || 'Failed to verify offer ownership', code: offerError.code },
          { status: 500 }
        );
      }
    }

    // Sprawdź, czy użytkownik jest właścicielem grupy
    if (offer.groups.owner_id !== profile.id) {
      return NextResponse.json(
        { error: 'You do not have permission to add instructions to this offer' },
        { status: 403 }
      );
    }

    // Inicjalizacja serwisów bezpieczeństwa
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    const kms = new KeyManagementService(masterKey);
    const encryptionService = new InstructionEncryptionService(kms);
    const securityLogger = new SecurityLogger(profile.id);

    // Pobierz lub wygeneruj klucz dla grupy
    let keyId;
    const { data: existingKey, error: keyError } = await supabaseAuth
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'group')
      .eq('related_id', groupSubId)
      .eq('active', true)
      .single();

    if (keyError) {
      if (keyError.code !== 'PGRST116') { // Ignorujemy błąd "nie znaleziono"
        console.error('Error fetching encryption key:', keyError);
        await securityLogger.logSecurityEvent(
          'instruction_encryption',
          'group_sub',
          groupSubId,
          'failure',
          { error: keyError.message, code: keyError.code }
        );
        
        return NextResponse.json(
          { error: keyError.message || 'Failed to retrieve encryption key', code: keyError.code },
          { status: 500 }
        );
      }
    }

    if (existingKey) {
      keyId = existingKey.id;
    } else {
      try {
        // Generuj nowy klucz
        keyId = await kms.generateKeyPair('group', groupSubId);
      } catch (genError) {
        console.error('Error generating key pair:', genError);
        await securityLogger.logSecurityEvent(
          'instruction_encryption',
          'group_sub',
          groupSubId,
          'failure',
          { error: genError.message }
        );
        
        return NextResponse.json(
          { error: 'Failed to generate encryption key' },
          { status: 500 }
        );
      }
    }

    // Szyfruj instrukcje
    let encryptedData;
    try {
      encryptedData = await encryptionService.encryptInstructions(
        instructions,
        keyId
      );
    } catch (encryptError) {
      console.error('Error encrypting instructions:', encryptError);
      await securityLogger.logSecurityEvent(
        'instruction_encryption',
        'group_sub',
        groupSubId,
        'failure',
        { error: encryptError.message }
      );
      
      return NextResponse.json(
        { error: 'Failed to encrypt instructions' },
        { status: 500 }
      );
    }

    // Zapisz zaszyfrowane instrukcje
    const { data: savedData, error: saveError } = await supabaseAuth
      .from('access_instructions')
      .upsert({
        group_sub_id: groupSubId,
        encrypted_data: encryptedData.encryptedData,
        data_key_enc: encryptedData.encryptedKey,
        encryption_key_id: keyId,
        encryption_version: '1.0',
        iv: encryptedData.iv,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'group_sub_id'
      })
      .select();

    if (saveError) {
      // Szczegółowa obsługa błędów
      await securityLogger.logSecurityEvent(
        'instruction_encryption',
        'group_sub',
        groupSubId,
        'failure',
        { error: saveError.message, code: saveError.code }
      );
      
      if (saveError.code === '42501') {
        return NextResponse.json(
          { error: 'You do not have permission to save instructions', code: saveError.code },
          { status: 403 }
        );
      } else if (saveError.code === '23503') {
        return NextResponse.json(
          { error: 'Referenced subscription does not exist', code: saveError.code },
          { status: 400 }
        );
      } else {
        console.error('Error saving encrypted instructions:', saveError);
        return NextResponse.json(
          { error: saveError.message || 'Failed to save encrypted instructions', code: saveError.code },
          { status: 500 }
        );
      }
    }
    
    // Sprawdzenie czy dane zostały zapisane
    if (!savedData || savedData.length === 0) {
      console.warn('No data returned after saving instructions');
      await securityLogger.logSecurityEvent(
        'instruction_encryption',
        'group_sub',
        groupSubId,
        'warning',
        { message: 'No data returned after saving' }
      );
      
      return NextResponse.json(
        { error: 'Instructions saved but no confirmation data returned' },
        { status: 500 }
      );
    }

    // Zaktualizuj flagę instant_access w ofercie
    const { error: updateError } = await supabaseAuth
      .from('group_subs')
      .update({ instant_access: true })
      .eq('id', groupSubId);

    if (updateError) {
      console.warn('Error updating instant_access flag:', updateError);
      // Nie zwracamy błędu, ponieważ główna operacja się udała
    }

    // Zaloguj operację
    await securityLogger.logSecurityEvent(
      'instruction_encryption',
      'group_sub',
      groupSubId,
      'success'
    );

    return NextResponse.json({
      message: 'Instructions encrypted and saved successfully',
      instructionId: savedData[0].id
    });
  } catch (error) {
    console.error('Error encrypting instructions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process instructions' },
      { status: 500 }
    );
  }
}