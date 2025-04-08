export const dynamic = 'force-dynamic';
import { Webhook } from 'svix';
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req) {
  // Weryfikacja webhook - pobierz z dokumentacji Clerk
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
  
  // Jeśli brakuje wymaganych nagłówków, zwróć błąd
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Błąd weryfikacji webhook", {
      status: 400
    });
  }

  // Pobierz body żądania
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  // Weryfikuj podpis
  let event;
  try {
    const webhook = new Webhook(WEBHOOK_SECRET);
    event = webhook.verify(
      body,
      {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }
    );
  } catch (err) {
    console.error("Błąd weryfikacji webhook:", err);
    return new Response("Błąd weryfikacji webhook", {
      status: 400
    });
  }

  // Obsługa różnych typów zdarzeń
  const eventType = event.type;
  console.log(`Otrzymano webhook typu: ${eventType}`);
  
  if (eventType === "user.created" || eventType === "user.updated") {
    // Pobierz dane użytkownika
    const { id, email_addresses, first_name, last_name, image_url } = event.data;
    const email = email_addresses[0]?.email_address;
    
    try {
      // Wywołaj funkcję obsługującą synchronizację użytkownika
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/handle_clerk_user_creation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({
          user_id: id,
          email: email,
          first_name: first_name,
          last_name: last_name,
          image_url: image_url
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Użytkownik przetworzony:', result);
      
    } catch (error) {
      console.error('Błąd podczas przetwarzania użytkownika:', error);
      // Nadal zwracamy 200 OK, aby Clerk nie próbował ponownie wysłać webhook
    }
  }
  
  // Zawsze zwracaj 200 OK dla Clerk, aby nie wysyłał ponownie
  return NextResponse.json({ success: true });
}