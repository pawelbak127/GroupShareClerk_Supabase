export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';
import { getAuthenticatedSupabaseClient } from '@/lib/clerk-supabase-server';

/**
 * POST /api/purchases/[id]/confirm-access
 * Potwierdza, że kupujący otrzymał działający dostęp
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { isWorking } = await request.json();
    
    if (typeof isWorking !== 'boolean') {
      return NextResponse.json(
        { error: 'isWorking field must be a boolean value' },
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
    
    // Użyj nowej metody uwierzytelniania
    const supabaseWithAuth = await getAuthenticatedSupabaseClient(user);
    
    // Pobierz informacje o zakupie - RLS w Supabase automatycznie sprawdzi dostęp użytkownika
    const { data: purchase, error: purchaseError } = await supabaseWithAuth
      .from('purchase_records')
      .select(`
        id,
        user_id,
        group_sub_id,
        group_sub:group_subs(
          groups(owner_id)
        ),
        status,
        access_provided
      `)
      .eq('id', id)
      .single();
    
    if (purchaseError) {
      if (purchaseError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase record not found', code: purchaseError.code },
          { status: 404 }
        );
      } else {
        console.error('Error fetching purchase record:', purchaseError);
        return NextResponse.json(
          { error: purchaseError.message || 'Failed to fetch purchase record', code: purchaseError.code },
          { status: 403 }
        );
      }
    }
    
    // Sprawdź, czy dostęp został wcześniej udostępniony
    if (!purchase.access_provided) {
      return NextResponse.json(
        { error: 'Access has not been provided yet' },
        { status: 400 }
      );
    }
    
    // Aktualizuj status potwierdzenia z autoryzowanym klientem
    const { data: updateData, error: updateError } = await supabaseWithAuth
      .from('purchase_records')
      .update({
        access_confirmed: true,
        access_confirmed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (updateError) {
      console.error('Error confirming access:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to confirm access', code: updateError.code },
        { status: updateError.code === 'PGRST116' ? 404 : 500 }
      );
    }
    
    // Sprawdzenie czy dane zostały zaktualizowane
    if (!updateData || updateData.length === 0) {
      console.warn('No data returned after confirming access');
      return NextResponse.json(
        { error: 'Access confirmation may have failed' },
        { status: 500 }
      );
    }
    
    // Jeśli dostęp nie działa, utwórz spór
    if (!isWorking) {
      // Pobierz powiązaną transakcję z autoryzowanym klientem
      const { data: transactionData, error: transactionError } = await supabaseWithAuth
        .from('transactions')
        .select('id')
        .eq('purchase_record_id', id)
        .single();
      
      if (transactionError) {
        console.error('Error fetching transaction:', transactionError);
        // Kontynuujemy mimo błędu, główna funkcjonalność została wykonana
      }
      
      const transactionId = transactionData?.id;
      
      try {
        // Nadal używamy supabaseAdmin dla pewnych operacji, które wymagają uprawnień admina
        const { data: dispute, error: disputeError } = await supabaseAdmin
          .from('disputes')
          .insert({
            reporter_id: purchase.user_id,  // Używamy purchase.user_id zamiast dodatkowego pobierania profilu
            reported_entity_type: 'subscription',
            reported_entity_id: purchase.group_sub_id,
            transaction_id: transactionId,
            dispute_type: 'access',
            description: 'Automatyczne zgłoszenie: problem z dostępem do subskrypcji',
            status: 'open',
            evidence_required: true,
            resolution_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 dni
          })
          .select()
          .single();
        
        if (disputeError) {
          console.error('Error creating dispute:', disputeError);
          return NextResponse.json({
            message: 'Access confirmation successful, but failed to create dispute record',
            confirmed: true,
            disputeCreated: false
          });
        }
        
        // Powiadom kupującego
        await createNotification(
          purchase.user_id,
          'dispute_created',
          'Zgłoszenie problemu z dostępem',
          'Twoje zgłoszenie zostało zarejestrowane. Skontaktujemy się z Tobą wkrótce.',
          'dispute',
          dispute.id
        );
        
        // Powiadom sprzedającego
        await createNotification(
          purchase.group_sub.groups.owner_id,
          'dispute_filed',
          'Zgłoszono problem z dostępem',
          'Kupujący zgłosił problem z dostępem do Twojej subskrypcji. Prosimy o pilną weryfikację.',
          'dispute',
          dispute.id
        );
        
        return NextResponse.json({
          message: 'Access confirmation and dispute filed successfully',
          disputeId: dispute.id,
          confirmed: true,
          disputeCreated: true
        });
      } catch (error) {
        console.error('Error in dispute creation process:', error);
        return NextResponse.json({
          message: 'Access confirmation successful, but dispute creation failed',
          confirmed: true,
          disputeCreated: false,
          error: error.message
        });
      }
    }
    
    // Jeśli dostęp działa poprawnie
    return NextResponse.json({
      message: 'Access confirmed successfully',
      confirmed: true
    });
  } catch (error) {
    console.error('Error confirming access:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm access' },
      { status: 500 }
    );
  }
}

// Pomocnicza funkcja do tworzenia powiadomień
async function createNotification(
  userId,
  type,
  title,
  content,
  relatedEntityType,
  relatedEntityId
) {
  try {
    // Używamy supabaseAdmin, aby ominąć RLS
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        title: title,
        content: content,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        created_at: new Date().toISOString(),
        read: false
      });
    
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Exception when creating notification:', error);
  }
}