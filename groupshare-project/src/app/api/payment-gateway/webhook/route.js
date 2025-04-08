export const dynamic = 'force-dynamic';

// src/app/api/payment-gateway/webhook/route.js
export async function POST(request) {
    try {
      // Weryfikacja podpisu od dostawcy płatności
      const signature = request.headers.get('x-payment-signature');
      const payload = await request.json();
      
      // Weryfikacja autentyczności webhook'a (w rzeczywistej implementacji)
      if (!verifyPaymentWebhookSignature(payload, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      const { transactionId, status, paymentId } = payload;
      
      // Aktualizacja transakcji
      await supabase
        .from('transactions')
        .update({
          status: status,
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', transactionId);
      
      // Jeśli płatność została zakończona pomyślnie
      if (status === 'completed') {
        const { data: transaction } = await supabase
          .from('transactions')
          .select('purchase_record_id, group_sub_id')
          .eq('id', transactionId)
          .single();
        
        // Aktualizacja zakupu
        await supabase
          .from('purchase_records')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.purchase_record_id);
        
        // Aktualizacja liczby dostępnych miejsc
        await supabase
          .from('group_subs')
          .update({
            slots_available: supabase.rpc('decrement', { x: 1 }),
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.group_sub_id);
        
        // Generowanie tokenu dostępu
        const tokenService = new TokenService();
        const token = await tokenService.generateAccessToken(transaction.purchase_record_id);
        
        // Notyfikacja dla kupującego
        await createNotification(
          transaction.buyer_id,
          'purchase_completed',
          'Zakup zakończony pomyślnie',
          'Twój zakup został pomyślnie zakończony. Kliknij, aby zobaczyć szczegóły dostępu.',
          'purchase',
          transaction.purchase_record_id
        );
        
        // Notyfikacja dla sprzedającego
        await createNotification(
          transaction.seller_id,
          'sale_completed',
          'Sprzedaż zakończona pomyślnie',
          'Ktoś właśnie kupił miejsce w Twojej subskrypcji.',
          'purchase',
          transaction.purchase_record_id
        );
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