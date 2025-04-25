# Dokumentacja bazy danych GroupShare

## 1. Przegląd systemu

GroupShare to aplikacja do znajdowania osób do wspólnej subskrypcji usług cyfrowych (np. Netflix, Spotify, YouTube Premium). System umożliwia użytkownikom:
- Tworzenie grup i ofert udostępniania subskrypcji
- Wyszukiwanie i zakup miejsc w istniejących subskrypcjach
- Natychmiastowy dostęp do zakupionych usług
- Bezpieczne płatności i komunikację pomiędzy użytkownikami

## 2. Schemat bazy danych

### 2.1. Tabele podstawowe

#### user_profiles
Przechowuje informacje o użytkownikach.
- `id` - Unikalne ID użytkownika
- `external_auth_id` - ID z systemu uwierzytelniania (np. Auth0, Supabase Auth)
- `display_name` - Wyświetlana nazwa użytkownika
- `email` - Adres email użytkownika
- `phone_number` - Numer telefonu (opcjonalny)
- `profile_type` - Typ profilu: 'seller', 'buyer', 'both'
- `verification_level` - Poziom weryfikacji: 'basic', 'verified', 'trusted'
- `bio` - Krótki opis użytkownika
- `avatar_url` - URL do zdjęcia profilowego
- `preferences` - Preferencje użytkownika (JSONB)
- `rating_avg` - Średnia ocena użytkownika
- `rating_count` - Liczba otrzymanych ocen
- `is_premium` - Czy użytkownik ma konto premium
- `subscription_tier` - Poziom subskrypcji: 'free', 'basic', 'premium'
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### groups
Reprezentuje grupy użytkowników, które mogą udostępniać subskrypcje.
- `id` - Unikalne ID grupy
- `name` - Nazwa grupy
- `description` - Opis grupy
- `owner_id` - ID właściciela grupy (FK -> user_profiles.id)
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### group_members
Przechowuje członków grup.
- `id` - Unikalne ID członkostwa
- `group_id` - ID grupy (FK -> groups.id)
- `user_id` - ID użytkownika (FK -> user_profiles.id)
- `role` - Rola w grupie: 'admin', 'member'
- `status` - Status członkostwa: 'invited', 'active', 'suspended'
- `invited_by` - ID użytkownika, który zaprosił (FK -> user_profiles.id)
- `joined_at` - Data dołączenia
- `created_at` - Data utworzenia

#### subscription_platforms
Platformy subskrypcyjne dostępne w systemie.
- `id` - Unikalne ID platformy
- `name` - Nazwa platformy (np. "Netflix")
- `description` - Opis platformy
- `icon` - Ikona platformy
- `max_members` - Maksymalna liczba członków
- `requirements_text` - Tekst opisujący wymagania
- `requirements_icon` - Ikona wymagań
- `pricing` - Informacje o cenach (JSONB)
- `active` - Czy platforma jest aktywna
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### group_subs
Oferty subskrypcji grupowych.
- `id` - Unikalne ID oferty
- `group_id` - ID grupy (FK -> groups.id)
- `platform_id` - ID platformy (FK -> subscription_platforms.id)
- `status` - Status oferty: 'active', 'inactive', 'full'
- `slots_total` - Całkowita liczba dostępnych miejsc
- `slots_available` - Liczba wolnych miejsc
- `price_per_slot` - Cena za jedno miejsce
- `currency` - Waluta (domyślnie 'PLN')
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

### 2.2. Tabele transakcyjne

#### purchase_records
Rekordy zakupu miejsc w subskrypcjach.
- `id` - Unikalne ID zakupu
- `user_id` - ID kupującego (FK -> user_profiles.id)
- `group_sub_id` - ID subskrypcji (FK -> group_subs.id)
- `status` - Status zakupu: 'pending_payment', 'payment_processing', 'completed', 'failed', 'refunded'
- `access_provided` - Czy dostęp został przyznany
- `access_provided_at` - Kiedy przyznano dostęp
- `access_confirmed` - Czy dostęp został potwierdzony przez użytkownika
- `access_confirmed_at` - Kiedy potwierdzono dostęp
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### transactions
Transakcje finansowe w systemie.
- `id` - Unikalne ID transakcji
- `buyer_id` - ID kupującego (FK -> user_profiles.id)
- `seller_id` - ID sprzedającego (FK -> user_profiles.id)
- `group_sub_id` - ID subskrypcji (FK -> group_subs.id)
- `purchase_record_id` - ID rekordu zakupu (FK -> purchase_records.id)
- `amount` - Całkowita kwota
- `platform_fee` - Opłata platformy
- `seller_amount` - Kwota dla sprzedającego
- `currency` - Waluta
- `payment_method` - Metoda płatności
- `payment_provider` - Dostawca płatności
- `payment_id` - ID płatności u dostawcy
- `status` - Status transakcji: 'pending', 'processing', 'completed', 'failed', 'refunded'
- `created_at`, `updated_at`, `completed_at` - Daty utworzenia, aktualizacji i zakończenia

#### access_instructions
Instrukcje dostępu (zaszyfrowane).
- `id` - Unikalne ID instrukcji
- `group_sub_id` - ID subskrypcji (FK -> group_subs.id)
- `encrypted_data` - Zaszyfrowane dane dostępowe
- `data_key_enc` - Zaszyfrowany klucz danych
- `encryption_key_id` - ID klucza szyfrowania (FK -> encryption_keys.id)
- `iv` - Wektor inicjalizacji
- `encryption_version` - Wersja szyfrowania
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

### 2.3. Tabele bezpieczeństwa

#### encryption_keys
Klucze szyfrowania dla bezpiecznego przechowywania danych.
- `id` - Unikalne ID klucza
- `key_type` - Typ klucza
- `public_key` - Klucz publiczny
- `private_key_enc` - Zaszyfrowany klucz prywatny
- `related_id` - Powiązane ID (opcjonalne)
- `active` - Czy klucz jest aktywny
- `created_at`, `rotated_at`, `expires_at` - Daty utworzenia, rotacji i wygaśnięcia

#### security_logs
Logi bezpieczeństwa.
- `id` - Unikalne ID logu
- `user_id` - ID użytkownika (opcjonalne, FK -> user_profiles.id)
- `action_type` - Typ akcji
- `resource_type` - Typ zasobu
- `resource_id` - ID zasobu
- `status` - Status akcji
- `ip_address` - Adres IP
- `user_agent` - User Agent
- `details` - Szczegóły (JSONB)
- `created_at` - Data utworzenia

#### device_fingerprints
Odciski urządzeń użytkowników.
- `id` - Unikalne ID odcisku
- `user_id` - ID użytkownika (FK -> user_profiles.id)
- `fingerprint` - Odcisk urządzenia
- `first_seen_at` - Kiedy pierwszy raz widziane
- `last_seen_at` - Kiedy ostatnio widziane
- `counter` - Licznik użyć

#### access_tokens
Tokeny dostępu.
- `id` - Unikalne ID tokenu
- `purchase_record_id` - ID zakupu (FK -> purchase_records.id)
- `token_hash` - Hasz tokenu
- `expires_at` - Data wygaśnięcia
- `used` - Czy token został użyty
- `used_at` - Kiedy użyto tokenu
- `ip_address` - Adres IP
- `user_agent` - User Agent
- `created_at` - Data utworzenia

### 2.4. Tabele komunikacji i rozstrzygania sporów

#### notifications
Powiadomienia dla użytkowników.
- `id` - Unikalne ID powiadomienia
- `user_id` - ID użytkownika (FK -> user_profiles.id)
- `type` - Typ powiadomienia
- `title` - Tytuł
- `content` - Treść
- `related_entity_type` - Typ powiązanego podmiotu
- `related_entity_id` - ID powiązanego podmiotu
- `is_read` - Czy przeczytane
- `created_at` - Data utworzenia

#### messages
Wiadomości między użytkownikami.
- `id` - Unikalne ID wiadomości
- `sender_id` - ID nadawcy (FK -> user_profiles.id)
- `receiver_id` - ID odbiorcy (FK -> user_profiles.id)
- `content` - Treść
- `thread_id` - ID wątku (FK -> message_threads.id)
- `is_read` - Czy przeczytane
- `created_at` - Data utworzenia

#### message_threads
Wątki konwersacji.
- `id` - Unikalne ID wątku
- `title` - Tytuł
- `related_entity_type` - Typ powiązanego podmiotu
- `related_entity_id` - ID powiązanego podmiotu
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### message_thread_participants
Uczestnicy wątków.
- `thread_id` - ID wątku (FK -> message_threads.id)
- `user_id` - ID użytkownika (FK -> user_profiles.id)
- `joined_at` - Data dołączenia
- `last_read_at` - Data ostatniego odczytu

#### group_invitations
Zaproszenia do grup.
- `id` - Unikalne ID zaproszenia
- `group_id` - ID grupy (FK -> groups.id)
- `email` - Email zapraszanego
- `invited_by` - ID zapraszającego (FK -> user_profiles.id)
- `role` - Proponowana rola
- `invitation_token` - Token zaproszenia
- `status` - Status: 'pending', 'accepted', 'rejected', 'expired'
- `expires_at` - Data wygaśnięcia
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### disputes
Spory między użytkownikami.
- `id` - Unikalne ID sporu
- `reporter_id` - ID zgłaszającego (FK -> user_profiles.id)
- `reported_entity_type` - Typ zgłaszanego podmiotu
- `reported_entity_id` - ID zgłaszanego podmiotu
- `transaction_id` - ID transakcji (FK -> transactions.id)
- `dispute_type` - Typ sporu
- `description` - Opis
- `status` - Status: 'open', 'investigating', 'resolved', 'rejected'
- `resolution_note` - Notatka o rozwiązaniu
- `resolved_by` - ID rozwiązującego (FK -> user_profiles.id)
- `evidence_required` - Czy wymagane są dowody
- `resolution_deadline` - Termin rozwiązania
- `refund_amount` - Kwota zwrotu
- `refund_status` - Status zwrotu
- `created_at`, `updated_at` - Daty utworzenia i aktualizacji

#### dispute_comments
Komentarze do sporów.
- `id` - Unikalne ID komentarza
- `dispute_id` - ID sporu (FK -> disputes.id)
- `user_id` - ID użytkownika (FK -> user_profiles.id)
- `comment` - Treść komentarza
- `is_internal` - Czy wewnętrzny
- `created_at` - Data utworzenia

#### dispute_evidence
Dowody w sporach.
- `id` - Unikalne ID dowodu
- `dispute_id` - ID sporu (FK -> disputes.id)
- `user_id` - ID użytkownika (FK -> user_profiles.id)
- `title` - Tytuł
- `description` - Opis
- `evidence_type` - Typ dowodu
- `content` - Treść/URL
- `created_at` - Data utworzenia

#### ratings
Oceny użytkowników.
- `id` - Unikalne ID oceny
- `rater_id` - ID oceniającego (FK -> user_profiles.id)
- `rated_id` - ID ocenianego (FK -> user_profiles.id)
- `transaction_id` - ID transakcji (FK -> transactions.id)
- `access_quality` - Jakość dostępu (1-5)
- `communication` - Komunikacja (1-5)
- `reliability` - Niezawodność (1-5)
- `comment` - Komentarz
- `created_at` - Data utworzenia

## 3. Kluczowe funkcje

### 3.1. Zarządzanie użytkownikami i grupami

- `is_group_member(group_id, user_id)` - Sprawdza, czy użytkownik jest członkiem grupy
- `is_group_admin(group_id, user_id)` - Sprawdza, czy użytkownik jest administratorem grupy
- `is_group_owner(group_id, user_id)` - Sprawdza, czy użytkownik jest właścicielem grupy
- `calculate_user_ratings(user_id)` - Oblicza średnią ocenę użytkownika
- `create_group_invitation(group_id, email, invited_by, role, expires_in_days)` - Tworzy zaproszenie do grupy
- `accept_group_invitation(invitation_token, user_id)` - Akceptuje zaproszenie do grupy

### 3.2. Zarządzanie subskrypcjami i zakupami

- `check_slots_available(group_sub_id)` - Sprawdza, czy są dostępne miejsca w subskrypcji
- `reserve_subscription_slot(group_sub_id, user_id)` - Rezerwuje miejsce w subskrypcji
- `can_access_subscription(user_id, group_sub_id)` - Sprawdza, czy użytkownik ma dostęp do subskrypcji
- `get_access_instructions(purchase_record_id)` - Pobiera instrukcje dostępu dla zakupu

### 3.3. Zarządzanie płatnościami

- `create_transaction(buyer_id, seller_id, group_sub_id, purchase_record_id, amount, platform_fee_percent, payment_method, payment_provider, payment_id)` - Tworzy transakcję
- `complete_transaction(transaction_id, status)` - Kończy transakcję
- `process_payment(user_id, group_sub_id, payment_method, payment_provider, payment_id)` - Przetwarza płatność w jednym kroku

### 3.4. Bezpieczeństwo i monitorowanie

- `generate_secure_token()` - Generuje bezpieczny token
- `log_security_event(user_id, action_type, resource_type, resource_id, status, ip_address, user_agent, details)` - Loguje zdarzenie bezpieczeństwa
- `track_device_fingerprint(user_id, fingerprint)` - Śledzi odcisk urządzenia
- `check_suspicious_activity(user_id, action_type, ip_address, user_agent)` - Sprawdza podejrzaną aktywność

### 3.5. Komunikacja i rozstrzyganie sporów

- `create_notification(user_id, type, title, content, related_entity_type, related_entity_id)` - Tworzy powiadomienie
- `create_message_thread(title, participants, related_entity_type, related_entity_id)` - Tworzy wątek konwersacji
- `send_message(sender_id, receiver_id, content, thread_id)` - Wysyła wiadomość
- `create_dispute(reporter_id, reported_entity_type, reported_entity_id, dispute_type, description, transaction_id)` - Tworzy spór
- `add_dispute_comment(dispute_id, user_id, comment, is_internal)` - Dodaje komentarz do sporu
- `resolve_dispute(dispute_id, resolver_id, status, resolution_note)` - Rozwiązuje spór

## 4. Wyzwalacze

- `update_updated_at_column()` - Aktualizuje kolumnę updated_at przy zmianach
- `update_group_sub_slots()` - Aktualizuje dostępne miejsca po zmianie statusu zakupu
- `handle_access_provision()` - Automatycznie przyznaje dostęp po zakończeniu płatności
- `notify_payment_status_change()` - Powiadamia użytkowników o zmianach statusu płatności
- `notify_purchase_record_status_change()` - Powiadamia użytkowników o zmianach statusu zakupu
- `validate_user_update()` - Waliduje aktualizacje profilu użytkownika

## 5. Materialized Views

- `user_stats` - Statystyki użytkowników (subskrypcje, zakupy)
- `platform_stats` - Statystyki platform (aktywne grupy, miejsca)

## 6. Row Level Security

Polityki bezpieczeństwa są zdefiniowane dla wszystkich tabel, zapewniając, że:
- Użytkownicy mogą widzieć tylko dane, do których powinni mieć dostęp
- Aktualizacje i usuwanie danych jest ograniczone do właścicieli lub uprawnionych administratorów
- Dane wrażliwe (np. instrukcje dostępu, klucze szyfrowania) są szczególnie chronione

## 7. Przepływ danych w typowych scenariuszach

### 7.1. Zakup miejsca w subskrypcji

1. Użytkownik wybiera subskrypcję i inicjuje proces zakupu
2. System wywołuje `process_payment()`, która:
   - Rezerwuje miejsce w subskrypcji (`reserve_subscription_slot()`)
   - Tworzy transakcję (`create_transaction()`)
   - Kończy transakcję (`complete_transaction()`)
3. Wyzwalacz `handle_access_provision()` automatycznie przyznaje dostęp
4. Wyzwalacz `notify_purchase_record_status_change()` wysyła powiadomienia
5. Użytkownik może pobrać instrukcje dostępu (`get_access_instructions()`)

### 7.2. Rozstrzyganie sporu

1. Użytkownik zgłasza spór (`create_dispute()`)
2. System powiadamia odpowiednich administratorów/właścicieli
3. Strony dodają komentarze i dowody (`add_dispute_comment()`)
4. Administrator rozwiązuje spór (`resolve_dispute()`)
5. System wysyła powiadomienia o rozstrzygnięciu

## 8. Indeksy i optymalizacje

Baza danych zawiera liczne indeksy optymalizujące najczęstsze zapytania:
- Indeksy podstawowe na kluczach głównych i obcych
- Indeksy złożone dla typowych wzorców zapytań
- Indeksy częściowe dla określonych statusów
- Widoki zmaterializowane dla kosztownych, często używanych zapytań
