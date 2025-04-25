# Przewodnik wdrożeniowy GroupShare

Ten przewodnik opisuje proces wdrażania aplikacji GroupShare w środowisku produkcyjnym. Przeznaczony jest dla zespołu DevOps i administratorów systemu.

## Spis treści

1. [Wymagania wstępne](#wymagania-wstępne)
2. [Architektura wdrożeniowa](#architektura-wdrożeniowa)
3. [Konfiguracja środowiska](#konfiguracja-środowiska)
4. [Wdrażanie aplikacji](#wdrażanie-aplikacji)
5. [Konfiguracja integracji](#konfiguracja-integracji)
6. [Monitoring i utrzymanie](#monitoring-i-utrzymanie)
7. [Procedury awaryjne](#procedury-awaryjne)
8. [Aktualizacje i zarządzanie wersjami](#aktualizacje-i-zarządzanie-wersjami)
9. [Lista kontrolna przed uruchomieniem produkcyjnym](#lista-kontrolna-przed-uruchomieniem-produkcyjnym)
10. [Kontakt i wsparcie](#kontakt-i-wsparcie)

## Wymagania wstępne

### Konta i subskrypcje

Przed rozpoczęciem wdrożenia, upewnij się, że posiadasz:

- Konto Vercel (plan Team lub Enterprise)
- Konto Supabase (plan Pro lub wyższy)
- Konto Clerk.dev (plan Starter lub wyższy)
- Konto PayU dla bramki płatności
- Konto Stripe dla bramki płatności

### Wymagania techniczne

- Node.js 18.x lub nowszy
- npm 9.x lub nowszy
- Git
- Terminal/CLI
- Dostęp administratora do wszystkich wymienionych serwisów

### Domeny i certyfikaty

- Zarejestrowana domena główna (np. groupshare.app)
- Subdomena dla API (np. api.groupshare.app)
- Certyfikaty SSL (automatycznie obsługiwane przez Vercel)

## Architektura wdrożeniowa

### Diagram architektury wdrożeniowej

```
+------------------------------------------+
|                                          |
|              Internet                    |
|                                          |
+------------------+---------------------+-+
                   |                     |
          +--------v--------+    +-------v---------+
          |                 |    |                 |
          |  Vercel Edge    |    |  Vercel Edge    |
          |  Network (CDN)  |    |  Network (CDN)  |
          |                 |    |                 |
          +--------+--------+    +--------+--------+
                   |                      |
         +---------v---------+   +--------v--------+
         |                   |   |                 |
         |  Front-end App    |   |  API Functions  |
         |  (Next.js SSR)    |   |  (Serverless)   |
         |                   |   |                 |
         +---------+---------+   +--------+--------+
                   |                      |
                   |                      |
                   |                      |
       +-----------v----------------------v-----------+
       |                                             |
       |              Supabase                       |
       |           (PostgreSQL DB)                   |
       |                                             |
       +-----+------------------------+------+-------+
             |                        |      |
      +------v------+         +-------v--+   |
      |             |         |          |   |
      |  Clerk.dev  |         |  PayU    |   |
      |  (Auth)     |         | (Payments)|  |
      |             |         |          |   |
      +-------------+         +----------+   |
                                             |
                                       +-----v----+
                                       |          |
                                       |  Stripe  |
                                       | (Payments)|
                                       |          |
                                       +----------+
```

### Przepływ danych

1. Użytkownik łączy się z aplikacją przez Vercel Edge Network
2. Żądania front-end są obsługiwane przez Next.js SSR
3. Żądania API są obsługiwane przez serverless functions
4. Autentykacja odbywa się przez Clerk.dev
5. Dane są przechowywane w Supabase (PostgreSQL)
6. Płatności są obsługiwane przez PayU i Stripe
7. Szyfrowanie danych dostępowych odbywa się na poziomie aplikacji

## Konfiguracja środowiska

### Supabase

#### 1. Utworzenie projektu

1. Zaloguj się do [Supabase](https://app.supabase.io/)
2. Kliknij "New Project"
3. Wprowadź nazwę projektu (np. "GroupShare-Prod")
4. Ustaw silne hasło do bazy danych
5. Wybierz region najbliższy Twojej lokalizacji lub docelowej grupie użytkowników (np. dla Polski wybierz Frankfurt EU)
6. Kliknij "Create new project"

#### 2. Inicjalizacja bazy danych

1. Przejdź do zakładki "SQL Editor"
2. Użyj plików SQL z repozytorium w następującej kolejności:
   - `scripts/db/01_schema.sql` - struktura bazy danych
   - `scripts/db/02_functions.sql` - funkcje i procedury
   - `scripts/db/03_policies.sql` - polityki bezpieczeństwa RLS
   - `scripts/db/04_seed.sql` - dane początkowe

#### 3. Konfiguracja polityk bezpieczeństwa

1. Przejdź do zakładki "Authentication" > "Policies"
2. Upewnij się, że wszystkie tabele mają skonfigurowane polityki RLS
3. Sprawdź, czy polityki są zgodne z modelem bezpieczeństwa aplikacji

#### 4. Pobierz dane połączenia

1. Przejdź do "Settings" > "API"
2. Zapisz następujące informacje:
   - Project URL
   - anon/public key
   - service_role key (do wdrożenia)

### Clerk.dev

#### 1. Utworzenie aplikacji

1. Zaloguj się do [Clerk Dashboard](https://dashboard.clerk.dev/)
2. Kliknij "Add Application"
3. Wprowadź nazwę aplikacji (np. "GroupShare")
4. Wybierz "Multi-session" i "Email/Password" jako metody uwierzytelniania
5. Kliknij "Create Application"

#### 2. Konfiguracja metod uwierzytelniania

1. Przejdź do "Authentication" > "Email & Password"
2. Włącz weryfikację email
3. Dostosuj wygląd emaili weryfikacyjnych
4. Opcjonalnie, skonfiguruj dodatkowe metody logowania (Google, Facebook)

#### 3. Konfiguracja domen

1. Przejdź do "Domains"
2. Dodaj domenę produkcyjną (np. groupshare.app)
3. Dodaj domenę deweloperską (np. localhost:3000)

#### 4. Pobierz klucze API

1. Przejdź do "API Keys"
2. Zapisz następujące klucze:
   - Publishable Key
   - Secret Key

### PayU

#### 1. Utworzenie konta handlowego

1. Zaloguj się do [PayU Manager](https://payu.pl)
2. Utwórz nowe konto handlowe dla aplikacji
3. Przejdź proces weryfikacji i aktywacji konta

#### 2. Konfiguracja punktu płatności

1. Utwórz nowy punkt płatności (POS)
2. Włącz żądane metody płatności (BLIK, karty, przelewy ekspresowe)
3. Skonfiguruj adres powrotu po płatności (np. https://groupshare.app/payments/callback)
4. Skonfiguruj adres dla notyfikacji (np. https://api.groupshare.app/webhooks/payu)

#### 3. Pobierz dane integracyjne

1. Zapisz następujące informacje:
   - Merchant ID
   - API Key
   - Second Key
   - POS ID

### Stripe

#### 1. Konfiguracja konta

1. Zaloguj się do [Stripe Dashboard](https://dashboard.stripe.com/)
2. Uzupełnij dane firmy i przejdź weryfikację
3. Skonfiguruj metody płatności (karty kredytowe/debetowe)

#### 2. Konfiguracja webhooków

1. Przejdź do "Developers" > "Webhooks"
2. Dodaj endpoint dla webhooków (np. https://api.groupshare.app/webhooks/stripe)
3. Wybierz zdarzenia do śledzenia (checkout.session.completed, payment_intent.succeeded, itp.)

#### 3. Pobierz klucze API

1. Przejdź do "Developers" > "API keys"
2. Zapisz następujące klucze:
   - Publishable Key
   - Secret Key
   - Webhook Signing Secret

## Wdrażanie aplikacji

### Konfiguracja Vercel

#### 1. Importowanie projektu

1. Zaloguj się do [Vercel](https://vercel.com/)
2. Kliknij "New Project"
3. Wybierz repozytorium GroupShare z GitHub/GitLab/Bitbucket
4. Skonfiguruj nazwę projektu

#### 2. Konfiguracja zmiennych środowiskowych

Dodaj następujące zmienne środowiskowe:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-publishable-key
CLERK_SECRET_KEY=your-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# PayU
PAYU_MERCHANT_ID=your-merchant-id
PAYU_API_KEY=your-api-key
PAYU_SECOND_KEY=your-second-key
PAYU_POS_ID=your-pos-id
PAYU_ENVIRONMENT=secure

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-publishable-key
STRIPE_SECRET_KEY=your-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Application
NEXT_PUBLIC_APP_URL=https://groupshare.app
NEXT_PUBLIC_API_URL=https://api.groupshare.app
ENCRYPTION_SECRET=your-encryption-secret-key
```

#### 3. Konfiguracja domeny

1. Po wdrożeniu, przejdź do zakładki "Domains"
2. Dodaj swoją domenę (np. groupshare.app)
3. Postępuj zgodnie z instrukcjami, aby skonfigurować rekordy DNS

### Wdrażanie z CLI

Alternatywnie, możesz wdrożyć aplikację za pomocą Vercel CLI:

```bash
# Instalacja Vercel CLI
npm install -g vercel

# Logowanie
vercel login

# Wdrożenie produkcyjne
vercel --prod
```

### CI/CD z GitHub Actions

Skonfiguruj automatyczne wdrażanie za pomocą GitHub Actions, tworząc plik `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Konfiguracja integracji

### Konfiguracja modułu szyfrowania

System używa asymetrycznego szyfrowania do zabezpieczenia instrukcji dostępu:

1. Wygeneruj parę kluczy RSA z poziomu panelu administracyjnego lub ręcznie:

```bash
# Generowanie klucza prywatnego
openssl genrsa -out private_key.pem 4096

# Generowanie klucza publicznego
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

2. Dodaj klucz publiczny do zmiennych środowiskowych:

```
PUBLIC_ENCRYPTION_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq...
```

3. Przechowuj klucz prywatny w bezpiecznym miejscu (np. Vercel Environment Variables lub innym secure vault)

```
PRIVATE_ENCRYPTION_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...
```

### Konfiguracja webhooków

#### PayU Webhook

1. Utwórz następujący endpoint w aplikacji: `/api/webhooks/payu`
2. Skonfiguruj weryfikację podpisu z PayU
3. Zaimplementuj obsługę następujących zdarzeń:
   - `PAYMENT_CREATED`
   - `PAYMENT_COMPLETED`
   - `PAYMENT_CANCELED`
   - `PAYMENT_REJECTED`

#### Stripe Webhook

1. Utwórz następujący endpoint w aplikacji: `/api/webhooks/stripe`
2. Skonfiguruj weryfikację podpisu ze Stripe
3. Zaimplementuj obsługę następujących zdarzeń:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### Konfiguracja harmonogramów

Ustaw następujące zadania cykliczne za pomocą Vercel Cron Jobs:

1. Weryfikacja ważności tokenów dostępu (co 15 minut)
2. Czyszczenie wygasłych tokenów (codziennie)
3. Aktualizacja statusu subskrypcji (codziennie)
4. Backup danych (codziennie)

## Monitoring i utrzymanie

### Konfiguracja monitoringu

#### Vercel Analytics

1. Przejdź do zakładki "Analytics" w projekcie Vercel
2. Włącz Web Vitals i Runtime monitoring
3. Ustaw alerty dla kluczowych metryk

#### Supabase Monitoring

1. Przejdź do "Settings" > "Database"
2. Skonfiguruj alerty dla użycia zasobów bazodanowych
3. Ustaw monitorowanie zapytań

#### Zewnętrzne narzędzia monitoringu

Możesz skonfigurować dodatkowe narzędzia:
- Sentry - do śledzenia błędów
- DataDog - do monitorowania infrastruktury
- Uptime Robot - do sprawdzania dostępności

### Zarządzanie logami

#### Logi aplikacji

1. Skonfiguruj logowanie zdarzeń do Supabase
2. Utwórz tabelę `logs` z odpowiednimi kolumnami:
   - `id` - identyfikator logu
   - `level` - poziom logu (info, warning, error)
   - `message` - treść logu
   - `metadata` - dodatkowe informacje (JSON)
   - `created_at` - data utworzenia

#### Logi infrastruktury

1. Korzystaj z logów Vercel dla aplikacji i API
2. Korzystaj z logów Supabase dla bazy danych
3. Zapisuj logi płatności z PayU i Stripe

### Kopie zapasowe

#### Backup bazy danych

1. Supabase Pro automatycznie tworzy kopie zapasowe
2. Dodatkowo, skonfiguruj eksport danych do zewnętrznego storage:

```bash
# Przykład eksportu bazy danych (uruchamiany jako Cron Job)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d).sql
```

#### Replikacja danych

Dla zwiększenia bezpieczeństwa, skonfiguruj replikację danych do innego regionu:

1. Utwórz drugi projekt Supabase w innym regionie
2. Skonfiguruj replikację między projektami
3. Przygotuj procedurę przełączania w przypadku awarii głównego regionu

## Procedury awaryjne

### Plan odzyskiwania po awarii (DRP)

#### Scenariusz 1: Awaria Vercel

1. Sprawdź status Vercel na [status.vercel.com](https://status.vercel.com)
2. Jeśli to problem globalny, monitoruj status i czekaj na rozwiązanie
3. Jeśli to problem specyficzny dla projektu:
   - Przejrzyj ostatnie wdrożenia i zmiany
   - Rozważ powrót do poprzedniej wersji (rollback)
   - Skontaktuj się z pomocą techniczną Vercel

#### Scenariusz 2: Awaria Supabase

1. Sprawdź status Supabase na [status.supabase.com](https://status.supabase.com)
2. Jeśli to problem globalny, monitoruj status i czekaj na rozwiązanie
3. Jeśli to problem specyficzny dla projektu:
   - Sprawdź wykorzystanie zasobów i limity
   - Rozważ przywrócenie z kopii zapasowej
   - Skontaktuj się z pomocą techniczną Supabase

#### Scenariusz 3: Problemy z płatnościami

1. Sprawdź logi transakcji i webhooków
2. Sprawdź status dostawców płatności:
   - [status.stripe.com](https://status.stripe.com)
   - Status PayU
3. Wstrzymaj automatyczne płatności, jeśli to konieczne
4. Powiadom użytkowników o problemach i przewidywanym czasie naprawy

### Procedura rollback

W przypadku krytycznych problemów po wdrożeniu:

1. Przejdź do Vercel Dashboard > Deployments
2. Znajdź ostatnie stabilne wdrożenie
3. Kliknij "..." > "Promote to Production"
4. Przywróć odpowiednią wersję bazy danych, jeśli dokonano zmian schematów

### Komunikacja podczas awarii

1. Przygotuj stronę statusu (np. status.groupshare.app)
2. Zaktualizuj status i przewidywany czas naprawy
3. Wyślij powiadomienia do użytkowników przez:
   - Email
   - Powiadomienia push
   - Media społecznościowe

## Aktualizacje i zarządzanie wersjami

### Strategia wdrażania

Rekomendujemy podejście blue-green do wdrażania:

1. Wdrażaj nową wersję do środowiska staged (green)
2. Przeprowadź testy na środowisku staged
3. Przełącz ruch z produkcji (blue) na nowe środowisko (green)
4. Monitoruj nowe środowisko
5. W przypadku problemów, przełącz ruch z powrotem

### Migracje bazy danych

Dla migracji bazy danych, stosuj następujące zasady:

1. Używaj przyrostowych migracji SQL
2. Testuj migracje na środowisku testowym
3. Twórz kopię zapasową przed migracją
4. Planuj migracje w godzinach niskiego ruchu
5. Migracje powinny być odwracalne gdy to możliwe

### Monitorowanie po wdrożeniu

Po wdrożeniu nowej wersji:

1. Monitoruj kluczowe metryki:
   - Czas odpowiedzi API
   - Wskaźniki Web Vitals
   - Liczba błędów
   - Użycie zasobów
2. Ustaw progi alertów
3. Przygotuj zespół do szybkiej reakcji na problemy

## Lista kontrolna przed uruchomieniem produkcyjnym

### Bezpieczeństwo

- [ ] Przeprowadzono audyt bezpieczeństwa
- [ ] Skonfigurowano HTTPS dla wszystkich domen
- [ ] Wdrożono polityki RLS w Supabase
- [ ] Zabezpieczono klucze API i tajne dane
- [ ] Wdrożono mechanizmy anty-fraud dla płatności
- [ ] Skonfigurowano rate limiting dla API
- [ ] Przeprowadzono testy penetracyjne

### Wydajność

- [ ] Zoptymalizowano zapytania bazodanowe
- [ ] Skonfigurowano cache dla często używanych danych
- [ ] Zoptymalizowano bundle size aplikacji
- [ ] Sprawdzono Web Vitals na różnych urządzeniach
- [ ] Przeprowadzono testy obciążeniowe

### Zgodność

- [ ] Zweryfikowano zgodność z RODO
- [ ] Wdrożono politykę prywatności
- [ ] Wdrożono regulamin usługi
- [ ] Zweryfikowano zgodność z przepisami dotyczącymi płatności
- [ ] Skonsultowano aspekty prawne z doradcą

### Funkcjonalność użytkownika

- [ ] Przeprowadzono testy akceptacyjne dla głównych ścieżek użytkownika
- [ ] Sprawdzono przepływy logowania/rejestracji
- [ ] Sprawdzono przepływy płatności
- [ ] Sprawdzono przepływy natychmiastowego dostępu
- [ ] Sprawdzono obsługę błędów i komunikaty

## Kontakt i wsparcie

### Zespół DevOps

W przypadku problemów z wdrożeniem, skontaktuj się z zespołem DevOps:

- Email: devops@groupshare.app
- Slack: #devops-support
- Telefon: +48 XXX XXX XXX (tylko w nagłych przypadkach)

### Zewnętrzni dostawcy usług

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [support.supabase.com](https://support.supabase.com)
- **Clerk Support**: [clerk.dev/support](https://clerk.dev/support)
- **PayU Support**: [payu.pl/pomoc](https://payu.pl/pomoc)
- **Stripe Support**: [support.stripe.com](https://support.stripe.com)

### Dokumentacja zewnętrzna

- [Dokumentacja Vercel](https://vercel.com/docs)
- [Dokumentacja Supabase](https://supabase.com/docs)
- [Dokumentacja Clerk](https://clerk.dev/docs)
- [Dokumentacja PayU](https://payu.com/pl/developers)
- [Dokumentacja Stripe](https://stripe.com/docs)

---

*Ostatnia aktualizacja: 1 kwietnia 2025*  
*Autor: Zespół GroupShare*  
*Wersja dokumentu: 1.0*