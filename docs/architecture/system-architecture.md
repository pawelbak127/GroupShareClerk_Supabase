# Architektura systemu GroupShare

## Przegląd architektury

GroupShare to aplikacja internetowa zbudowana w oparciu o architekturę serverless, z wykorzystaniem najnowszych technologii i usług chmurowych. System został zaprojektowany z myślą o bezpieczeństwie, skalowalności i łatwości rozwoju.

## Diagram architektury wysokiego poziomu

```
+----------------------------------+
|         Klient (Przeglądarka)    |
|  +------------------------------+|
|  |   Next.js SSR/CSR App        ||
|  |   React + TypeScript         ||
|  +------------------------------+|
+----------------------------------+
               |
               | HTTPS
               ▼
+----------------------------------+
|         Vercel (Hosting)         |
|  +------------------------------+|
|  |   Next.js Server             ||
|  |   API Routes (Serverless)    ||
|  +------------------------------+|
+----------------------------------+
       |            |           |
       ▼            ▼           ▼
+------------+ +------------+ +------------+
| Clerk.dev  | | Supabase   | | PayU/Stripe|
|(Auth)      | |(Database)  | |(Payments)  |
+------------+ +------------+ +------------+
```

## Komponenty systemu

### 1. Warstwa klienta (Frontend)

- **Technologie**: React, TypeScript, Next.js, Tailwind CSS
- **Główne komponenty**:
  - Interfejs użytkownika (komponenty UI)
  - Zarządzanie stanem (React Context / Hooks)
  - Obsługa formularzy i walidacji
  - Komunikacja z API
  - Routing i nawigacja
- **Cechy**:
  - Server-Side Rendering (SSR) dla lepszej wydajności i SEO
  - Progresywne ładowanie danych
  - Code-splitting dla optymalizacji rozmiaru paczki
  - Responsywny design (Mobile-first)

### 2. Warstwa serwera (Backend)

- **Technologie**: Next.js API Routes, Serverless Functions
- **Główne komponenty**:
  - Endpointy API dla operacji CRUD
  - Obsługa autentykacji i autoryzacji
  - Integracja z usługami płatności
  - Logika biznesowa
  - Bezpieczne zarządzanie dostępem do zasobów
- **Cechy**:
  - Architektura bezserwerowa (Serverless)
  - Automatyczne skalowanie w oparciu o obciążenie
  - Odporność na awarie

### 3. Warstwa danych

- **Technologie**: Supabase (PostgreSQL), Row Level Security (RLS)
- **Główne komponenty**:
  - Relacyjna baza danych
  - Mechanizmy bezpieczeństwa na poziomie wierszy
  - Wyzwalacze i funkcje bazy danych
  - Szyfrowanie wrażliwych danych
- **Cechy**:
  - Skalowalność horyzontalna
  - Zaawansowane zapytania SQL
  - Realtime subscriptions (opcjonalnie)
  - Silna izolacja danych między użytkownikami/grupami

### 4. Podsystem autentykacji

- **Technologie**: Clerk.dev
- **Główne komponenty**:
  - Rejestracja i logowanie użytkowników
  - Multi-factor authentication (MFA)
  - OAuth integracje (Google, Facebook)
  - Zarządzanie sesjami
- **Cechy**:
  - Delegacja zarządzania użytkownikami do wyspecjalizowanej usługi
  - Wysoka bezpieczeństwo i zgodność z regulacjami
  - Elastyczność w dostosowywaniu ścieżek uwierzytelniania

### 5. Podsystem płatności

- **Technologie**: PayU, Stripe
- **Główne komponenty**:
  - Integracja z bramkami płatności
  - Obsługa różnych metod płatności (BLIK, karty)
  - Zarządzanie transakcjami
  - Obsługa webhooków dla aktualizacji statusu płatności
- **Cechy**:
  - Bezpieczne przetwarzanie płatności
  - Automatyczne rekoncyliacje transakcji
  - Obsługa różnych scenariuszy płatności

### 6. System bezpieczeństwa

- **Technologie**: Asymetryczne szyfrowanie, secure vault
- **Główne komponenty**:
  - Szyfrowanie instrukcji dostępu
  - Bezpieczne przechowywanie kluczy
  - System tokenów jednorazowych
- **Cechy**:
  - Zero-knowledge architektura (brak dostępu do niezaszyfrowanych instrukcji)
  - Ścisła kontrola dostępu do wrażliwych danych
  - Audytowalność wszystkich operacji na danych wrażliwych

## Przepływy danych

### 1. Rejestracja i logowanie użytkownika

```
1. Użytkownik wprowadza dane rejestracji w UI
2. Żądanie jest przekazywane do Clerk.dev
3. Clerk.dev tworzy konto i zwraca token JWT
4. Frontend zapisuje token i przekierowuje do aplikacji
5. Backend weryfikuje token i tworzy profil użytkownika w Supabase
```

### 2. Tworzenie i udostępnianie subskrypcji

```
1. Właściciel tworzy nową ofertę subskrypcji
2. Frontend wysyła dane do API
3. Backend waliduje dane i zapisuje ofertę w Supabase
4. Właściciel dodaje zaszyfrowane instrukcje dostępu
5. Backend zapisuje zaszyfrowane dane w Supabase
```

### 3. Proces płatności i dostęp do subskrypcji

```
1. Użytkownik aplikuje o miejsce w subskrypcji
2. Właściciel akceptuje aplikację
3. Użytkownik wybiera metodę płatności i inicjuje transakcję
4. Frontend przekierowuje do bramki płatności (PayU/Stripe)
5. Po pomyślnej płatności, bramka wysyła webhook do backend
6. Backend weryfikuje płatność i generuje token dostępu
7. Użytkownik otrzymuje dostęp do zaszyfrowanych instrukcji
```

## Aspekty bezpieczeństwa

### 1. Ochrona danych wrażliwych

- **Szyfrowanie instrukcji dostępu**:
  - Dane są szyfrowane przy użyciu algorytmów asymetrycznych
  - Klucze prywatne są przechowywane w bezpiecznym vault
  - Deszyfrowanie odbywa się tylko w momencie autoryzowanego dostępu

- **Bezpieczeństwo danych płatniczych**:
  - Dane kart nie są przechowywane w systemie
  - Wszystkie operacje płatnicze są delegowane do certyfikowanych procesorów

### 2. Kontrola dostępu

- **Row Level Security (RLS)**:
  - Automatyczne filtrowanie danych na poziomie bazy danych
  - Polityki dostępu oparte na relacjach użytkownik-grupa
  - Szczegółowe uprawnienia dla różnych typów danych

- **Token-based authentication**:
  - Wszystkie żądania API wymagają ważnego tokenu JWT
  - Krótki czas życia tokenów dostępu
  - Możliwość natychmiastowego unieważnienia tokenów

### 3. Audyt i monitoring

- **Śledzenie aktywności**:
  - Logowanie wszystkich krytycznych operacji
  - Śledzenie użycia tokenów dostępu
  - Monitoring nietypowych wzorców użycia

- **Wykrywanie nadużyć**:
  - Systemy wykrywania podejrzanej aktywności
  - Limity częstotliwości zapytań (rate limiting)
  - Blokowanie podejrzanych adresów IP

## Skalowalność i wydajność

### 1. Strategia skalowania

- **Serverless architecture**:
  - Automatyczne skalowanie w oparciu o obciążenie
  - Pay-per-use model dla optymalnej efektywności kosztowej

- **Skalowanie bazy danych**:
  - Indeksy dla często używanych zapytań
  - Partycjonowanie danych dla większej wydajności
  - Możliwość skalowania Supabase w miarę wzrostu

### 2. Optymalizacja wydajności

- **Optymalizacja Frontend**:
  - Lazy loading komponentów i obrazów
  - Efektywne wykorzystanie cachingu
  - Minimalizacja bundle size

- **Optymalizacja Backend**:
  - Efektywne zapytania do bazy danych
  - Asynchroniczne przetwarzanie długotrwałych operacji
  - Caching częstych odpowiedzi API

## Integracje zewnętrzne

### 1. Usługi autentykacji
- **Clerk.dev API**: Zarządzanie użytkownikami, sesje, MFA

### 2. Usługi płatności
- **PayU API**: Integracja BLIK i innych metod płatności
- **Stripe API**: Obsługa płatności kartami, subskrypcje

### 3. Przyszłe potencjalne integracje
- **API platform subskrypcyjnych**: Bezpośrednie integracje z wybranymi platformami
- **Systemy analityczne**: Integracja z narzędziami analitycznymi

## Środowiska i wdrażanie

### 1. Środowiska
- **Development**: Lokalne środowisko deweloperskie
- **Staging**: Środowisko testowe (preview deployments)
- **Production**: Środowisko produkcyjne

### 2. CI/CD Pipeline
- **GitHub Actions**: Automatyczne testy, walidacja i wdrażanie
- **Vercel Integration**: Continuous deployment z preview dla każdego PR

### 3. Monitorowanie i obsługa błędów
- **Logging**: Centralne gromadzenie logów
- **Error tracking**: Monitorowanie i powiadamianie o błędach
- **Performance monitoring**: Śledzenie wydajności systemu

## Ograniczenia techniczne i kompromisy

### 1. Ograniczenia Serverless
- Zimny start (cold start) dla rzadko używanych funkcji
- Limity czasu wykonania (timeout limits)
- Ograniczenia wielkości payloadu

### 2. Kompromisy architektury
- Delegacja bezpieczeństwa do zewnętrznych usług vs. kontrola
- Prostota wdrażania vs. optymalizacja kosztów w długim terminie
- Szybkość rozwoju vs. pełna elastyczność

## Plany rozwoju architektury

### 1. Krótkoterminowe (0-6 miesięcy)
- Implementacja wszystkich komponentów MVP
- Optymalizacja wydajności i niezawodności

### 2. Średnioterminowe (6-12 miesięcy)
- Wprowadzenie warstwy cache dla zwiększenia wydajności
- Implementacja pełnego systemu analitycznego
- Rozszerzenie integracji z większą liczbą platform

### 3. Długoterminowe (12+ miesięcy)
- Rozwój natywnych aplikacji mobilnych (iOS/Android)
- Implementacja zaawansowanych algorytmów matchingu grup
- Potencjalna migracja do bardziej dedykowanej infrastruktury dla redukcji kosztów

---

*Ostatnia aktualizacja: 1 kwietnia 2025*  
*Autor: Zespół GroupShare*  
*Wersja: 1.0*