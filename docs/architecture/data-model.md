# Model danych GroupShare

## Przegląd modelu danych

Model danych GroupShare został zaprojektowany z uwzględnieniem następujących priorytetów:
- Bezpieczeństwo danych użytkowników i informacji dostępowych
- Elastyczność w zarządzaniu różnymi typami subskrypcji
- Precyzyjne śledzenie transakcji i płatności
- Efektywne zarządzanie relacjami między użytkownikami i grupami
- Wsparcie dla systemu natychmiastowego dostępu

## Diagram ERD

```
+-------------------+       +-------------------+       +-------------------+
|      users        |       |      groups       |       |   subscription    |
+-------------------+       +-------------------+       |     platforms     |
| id (PK)           |       | id (PK)           |       +-------------------+
| external_auth_id  |<---+  | name              |       | id (PK)           |
| email             |    |  | description       |       | name              |
| display_name      |    |  | owner_id (FK)     |----+  | description       |
| phone_number      |    |  | created_at        |    |  | icon              |
| profile_type      |    |  | updated_at        |    |  | max_members       |
| verification_level|    |  +-------------------+    |  | requirements_text |
| created_at        |    |         |                 |  | requirements_icon |
| updated_at        |    |         |                 |  | active            |
+-------------------+    |         |                 |  +-------------------+
        |                |         |                 |         |
        |                |         | 1:N             |         |
        |                |         |                 |         |
+-------------------+    |  +-------------------+    |  +-------------------+
|   user_profiles   |    |  |    group_members  |    |  |    group_subs     |
+-------------------+    |  +-------------------+    |  +-------------------+
| id (PK)           |    |  | id (PK)           |    |  | id (PK)           |
| user_id (FK)      |----+  | group_id (FK)     |----+  | group_id (FK)     |----+
| bio               |       | user_id (FK)      |----+  | platform_id (FK)  |<---+
| avatar_url        |       | role              |    |  | status            |
| preferences       |       | status            |    |  | slots_total       |
| rating_avg        |       | invited_by        |    |  | slots_available   |
| rating_count      |       | joined_at         |    |  | price_per_slot    |
| is_premium        |       +-------------------+    |  | currency          |
| subscription_tier |                                |  | instant_access    |
+-------------------+                                |  | created_at        |
                                                     |  | updated_at        |
+-------------------+       +-------------------+    |  +-------------------+
|    transactions   |       |   applications    |    |          |
+-------------------+       +-------------------+    |          |
| id (PK)           |       | id (PK)           |    |          |
| buyer_id (FK)     |<---+  | user_id (FK)      |----+          |
| seller_id (FK)    |<---+  | group_sub_id (FK) |<---+          |
| group_sub_id (FK) |<---+  | message           |               |
| application_id(FK)|----+  | status            |               |
| amount            |    |  | created_at        |               |
| platform_fee      |    |  | updated_at        |               |
| seller_amount     |    |  | access_provided   |               |
| currency          |    |  | access_confirmed  |               |
| payment_method    |    |  +-------------------+               |
| payment_provider  |    |          |                          |
| payment_id        |    |          |                          |
| status            |    |          |                          |
| created_at        |    |          |                          |
+-------------------+    |          |                          |
        |                |          |                          |
        |                |          |                          |
+-------------------+    |  +-------------------+    +-------------------+
|     ratings       |    |  |  access_tokens    |    | access_instructions|
+-------------------+    |  +-------------------+    +-------------------+
| id (PK)           |    |  | id (PK)           |    | id (PK)           |
| rater_id (FK)     |    |  | application_id(FK)|----+  | group_sub_id (FK) |<---+
| rated_id (FK)     |    +->| token             |       | encrypted_data   |
| transaction_id(FK)|----+  | expires_at        |       | encryption_version|
| access_quality    |       | used              |       | encryption_key_id |
| communication     |       | used_at           |       | created_at       |
| reliability       |       | ip_address        |       | updated_at       |
| comment           |       | user_agent        |       +-------------------+
| created_at        |       | created_at        |
+-------------------+       +-------------------+
```

## Opis encji

### 1. users
Przechowuje podstawowe informacje o użytkownikach.
- **external_auth_id**: ID z systemu autentykacji Clerk.dev
- **profile_type**: Określa typ profilu (seller/buyer/both)
- **verification_level**: Poziom weryfikacji tożsamości użytkownika

### 2. user_profiles
Rozszerzone informacje o profilu użytkownika.
- **preferences**: Preferencje użytkownika (format JSON)
- **rating_avg**: Średnia ocena użytkownika
- **is_premium**: Czy użytkownik ma konto premium

### 3. groups
Grupy użytkowników dzielących subskrypcje.
- **owner_id**: ID właściciela/administratora grupy

### 4. group_members
Członkowie grup.
- **role**: Rola w grupie (admin/member)
- **status**: Status członkostwa (invited/active/suspended)

### 5. subscription_platforms
Katalog platform subskrypcyjnych obsługiwanych przez system.
- **requirements_text**: Tekstowy opis wymagań platformy
- **requirements_icon**: Ikona reprezentująca typ wymagań

### 6. group_subs
Oferty subskrypcji grupowych.
- **slots_total**: Całkowita liczba miejsc w subskrypcji
- **slots_available**: Dostępne miejsca
- **instant_access**: Czy oferuje natychmiastowy dostęp

### 7. applications
Zgłoszenia do dołączenia do subskrypcji.
- **status**: Status aplikacji (pending/accepted/rejected/completed)
- **access_provided**: Czy dostęp został udostępniony
- **access_confirmed**: Czy dostęp został potwierdzony przez kupującego

### 8. access_tokens
Jednorazowe tokeny dostępu do instrukcji.
- **token**: Unikalny token dostępu
- **expires_at**: Data wygaśnięcia tokenu
- **used**: Czy token został wykorzystany

### 9. access_instructions
Zaszyfrowane instrukcje dostępu do subskrypcji.
- **encrypted_data**: Zaszyfrowane dane instrukcji
- **encryption_version**: Wersja algorytmu szyfrowania
- **encryption_key_id**: ID klucza użytego do szyfrowania

### 10. transactions
Rejestr transakcji finansowych.
- **payment_method**: Metoda płatności (blik/card/etc)
- **payment_provider**: Dostawca płatności (payu/stripe)
- **status**: Status transakcji (pending/completed/failed/refunded)

### 11. ratings
Oceny użytkowników.
- **access_quality**: Ocena jakości dostępu (1-5)
- **communication**: Ocena komunikacji (1-5)
- **reliability**: Ocena niezawodności (1-5)

## Kluczowe relacje

1. **users -> group_members**: Użytkownik może być członkiem wielu grup
2. **users -> groups**: Użytkownik może być właścicielem wielu grup
3. **groups -> group_subs**: Grupa może mieć wiele subskrypcji
4. **subscription_platforms -> group_subs**: Platforma może mieć wiele ofert subskrypcji
5. **group_subs -> applications**: Oferta subskrypcji może mieć wiele zgłoszeń
6. **applications -> access_tokens**: Zatwierdzona aplikacja może generować token dostępu
7. **group_subs -> access_instructions**: Oferta subskrypcji z instant_access ma instrukcje dostępu
8. **applications -> transactions**: Zatwierdzona aplikacja generuje transakcję

## Zabezpieczenia i prywatność danych

### Bezpieczeństwo danych wrażliwych
- Instrukcje dostępu są szyfrowane asymetrycznie przed zapisem do bazy danych
- Klucze prywatne do deszyfrowania są przechowywane w bezpiecznym vault
- Tokeny dostępu są jednorazowe i mają krótki czas ważności

### Row Level Security (RLS)
Polityki bezpieczeństwa na poziomie wierszy w Supabase:

1. **groups**: Użytkownicy mogą odczytywać grupy, ale modyfikować tylko te, których są właścicielami
2. **group_members**: Członkowie mogą widzieć tylko członków swoich grup
3. **group_subs**: Publiczny odczyt, ale modyfikacja tylko przez właściciela grupy
4. **access_instructions**: Całkowicie niedostępne z poziomu klienta
5. **access_tokens**: Dostępne tylko dla użytkownika, którego dotyczy token

## Indeksy i optymalizacja wydajności

Kluczowe indeksy dla optymalnej wydajności:

1. **groups**: indeks na owner_id
2. **group_members**: indeks na (group_id, user_id)
3. **group_subs**: indeks na (group_id, platform_id, status)
4. **applications**: indeks na (user_id, status), (group_sub_id, status)
5. **transactions**: indeks na (buyer_id, status), (seller_id, status)
6. **ratings**: indeks na (rated_id)

## Wersjonowanie i migracje

Model danych będzie ewoluował wraz z rozwojem aplikacji. Każda zmiana struktury będzie dokumentowana w migracji Supabase, z pełną historią zmian w repozytorium.

## Przyszłe rozszerzenia modelu

W przyszłych wersjach planujemy rozszerzenie modelu o:

1. **Powiadomienia**: System powiadomień w aplikacji
2. **Historia aktywności**: Szczegółowy dziennik aktywności użytkowników
3. **System rozstrzygania sporów**: Funkcjonalność mediacji i rozwiązywania problemów
4. **Szczegółowe mierniki używania subskrypcji**: Dane analityczne o korzystaniu z dostępów
