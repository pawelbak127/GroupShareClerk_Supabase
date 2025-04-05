import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseClient } from '../../../lib/supabase-client';
import crypto from 'crypto';

/**
 * POST /api/payments
 * Przetwarza płatność za subskrypcję i automatycznie przyznaje dostęp
 */
export async function POST(request) {
  try {
    const { purchaseId, paymentMethod } = await request.json();
    
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
    
    // Pobierz zakup i powiązaną ofertę
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .select(`
        id, status, group_sub_id, user_id,
        group_sub:group_subs(price_per_slot, currency, groups(owner_id))
      `)
      .eq('id', purchaseId)
      .single();
    
    if (purchaseError) {
      console.error('Error fetching purchase:', purchaseError);
      return NextResponse.json(
        { error: purchaseError.message || 'Purchase not found', code: purchaseError.code },
        { status: 404 }
      );
    }
    
    // Wywołaj funkcję process_payment z bazy danych
    const { data: paymentResult, error: paymentError } = await supabase.rpc(
      'process_payment',
      {
        p_user_id: user.id,
        p_group_sub_id: purchase.group_sub_id,
        p_payment_method: paymentMethod,
        p_payment_provider: 'stripe', // Możemy dostosować w zależności od wyboru
        p_payment_id: 'pmt_' + crypto.randomBytes(8).toString('hex')
      }
    );
    
    if (paymentError) {
      console.error('Error processing payment:', paymentError);
      return NextResponse.json(
        { error: paymentError.message || 'Failed to process payment', code: paymentError.code },
        { status: 500 }
      );
    }
    
    // Generowanie bezpiecznego tokenu dostępu
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_secure_token'
    );
    
    if (tokenError) {
      console.error('Error generating token:', tokenError);
    }
    
    // Użyj bezpiecznego tokenu z bazy danych lub wygeneruj zapasowy
    const token = tokenData || crypto.randomBytes(32).toString('hex');
    
    // Zapisanie tokenu dostępu
    const { error: insertError } = await supabase
      .from('access_tokens')
      .insert({
        purchase_record_id: purchaseId,
        token_hash: hashToken(token),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minut
        used: false
      });
      
    if (insertError) {
      console.error('Error saving access token:', insertError);
    }
    
    // Tworzymy URL dostępu
    const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/access?id=${purchaseId}&token=${token}`;
    
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      purchaseId: purchaseId,
      accessUrl: accessUrl
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Bezpieczna funkcja hashująca token
function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token + (process.env.TOKEN_SALT || ''))
    .digest('hex');
}