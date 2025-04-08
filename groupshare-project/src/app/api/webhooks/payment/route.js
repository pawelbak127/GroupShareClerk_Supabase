import { NextResponse } from "next/server";
import { headers } from "next/headers";
import supabaseAdmin from '@/lib/supabase-admin-client';

export async function POST(req) {
  try {
    // Weryfikacja podpisu od dostawcy płatności
    const signature = headers().get('x-payment-signature');
    const payload = await req.json();
    
    // Implementacja weryfikacji (w rzeczywistym projekcie)
    // if (!verifyPaymentWebhookSignature(payload, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }
    
    const { transactionId, status, paymentId } = payload;
    
    // Aktualizacja transakcji
    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: status,
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', transactionId);
      
    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    // Jeśli płatność została zakończona pomyślnie
    if (status === 'completed') {
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('purchase_record_id, group_sub_id, buyer_id, seller_id')
        .eq('id', transactionId)
        .single();
        
      if (txError) {
        console.error('Error fetching transaction details:', txError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      
      // Aktualizacja zakupu
      const { error: prError } = await supabaseAdmin
        .from('purchase_records')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.purchase_record_id);
        
      if (prError) {
        console.error('Error updating purchase record:', prError);
      }
      
      // Aktualizacja liczby dostępnych miejsc
      const { error: gsError } = await supabaseAdmin
        .from('group_subs')
        .update({
          slots_available: supabaseAdmin.rpc('decrement', { x: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.group_sub_id);
        
      if (gsError) {
        console.error('Error updating group subscription:', gsError);
      }
      
      // Tworzenie powiadomień (używając funkcji w bazie danych)
      await supabaseAdmin.rpc('create_notification', {
        p_user_id: transaction.buyer_id,
        p_type: 'purchase_completed',
        p_title: 'Zakup zakończony pomyślnie',
        p_content: 'Twój zakup został pomyślnie zakończony. Kliknij, aby zobaczyć szczegóły dostępu.',
        p_related_entity_type: 'purchase',
        p_related_entity_id: transaction.purchase_record_id
      });
      
      await supabaseAdmin.rpc('create_notification', {
        p_user_id: transaction.seller_id,
        p_type: 'sale_completed',
        p_title: 'Sprzedaż zakończona pomyślnie',
        p_content: 'Ktoś właśnie kupił miejsce w Twojej subskrypcji.',
        p_related_entity_type: 'purchase',
        p_related_entity_id: transaction.purchase_record_id
      });
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { error: 'Payment webhook processing failed' },
      { status: 500 }
    );
  }
}