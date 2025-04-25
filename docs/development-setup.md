# Instrukcja konfiguracji środowiska deweloperskiego

Ten dokument zawiera szczegółowe instrukcje dotyczące konfiguracji środowiska deweloperskiego dla projektu GroupShare. Postępuj zgodnie z tymi krokami, aby skonfigurować lokalne środowisko i rozpocząć pracę nad projektem.

## Wymagania wstępne

Przed rozpoczęciem pracy potrzebujesz zainstalować:

1. **Node.js** - wersja 18.x lub nowsza ([pobierz Node.js](https://nodejs.org/))
2. **npm** (instalowany automatycznie z Node.js) lub **Yarn**
3. **Git** - najnowsza wersja ([pobierz Git](https://git-scm.com/downloads))
4. **Edytor kodu** - zalecany Visual Studio Code z rozszerzeniami:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - PostCSS Language Support

## Klonowanie repozytorium

```bash
# Klonowanie repozytorium
git clone https://github.com/pawelbak127/GroupShare.git
cd GroupShare
```

## Instalacja zależności

```bash
# Użycie npm
npm install

# Lub użycie Yarn
yarn install
```

## Konfiguracja zmiennych środowiskowych

1. Skopiuj plik przykładowy `.env.example` do nowego pliku `.env.local`:

```bash
cp .env.example .env.local
```

2. Edytuj plik `.env.local` i dodaj odpowiednie klucze API i konfigurację:

```
# API keys
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Environment variables
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe keys
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# PayU keys
PAYU_MERCHANT_ID=your_payu_merchant_id
PAYU_API_KEY=your_payu_key
PAYU_SECOND_KEY=your_payu_second_key
PAYU_ENVIRONMENT=sandbox
```

## Konfiguracja Supabase

1. Utwórz darmowe konto na [Supabase](https://supabase.com/)
2. Utwórz nowy projekt
3. Skopiuj URL projektu i anonimowy klucz do pliku `.env.local`
4. Przejdź do sekcji SQL Editor i uruchom skrypty inicjalizujące z folderu `scripts/db`:

```bash
# Najpierw uruchom bazowy schemat
cat scripts/db/01_schema.sql | npx supabase db execute --project-ref YOUR_PROJECT_REF

# Następnie uruchom funkcje i triggery
cat scripts/db/02_functions.sql | npx supabase db execute --project-ref YOUR_PROJECT_REF

# Dodaj polityki RLS
cat scripts/db/03_policies.sql | npx supabase db execute --project-ref YOUR_PROJECT_REF

# Dodaj dane początkowe
cat scripts/db/04_seed.sql | npx supabase db execute --project-ref YOUR_PROJECT_REF
```

## Konfiguracja Clerk

1. Utwórz darmowe konto na [Clerk](https://clerk.dev/)
2. Utwórz nową aplikację
3. Przejdź do ustawień API Keys
4. Skopiuj klucze Publishable Key i Secret Key do pliku `.env.local`
5. Skonfiguruj URL przekierowania po uwierzytelnieniu w panelu Clerk na `http://localhost:3000`

## Konfiguracja Stripe (opcjonalnie na etapie początkowym)

1. Utwórz darmowe konto na [Stripe](https://stripe.com/)
2. Przejdź do sekcji Developers > API keys
3. Skopiuj klucze Publishable Key i Secret Key do pliku `.env.local`
4. Aby testować webhooks lokalnie, zainstaluj [Stripe CLI](https://stripe.com/docs/stripe-cli) i uruchom:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

5. Skopiuj klucz webhook signing secret i dodaj go do `.env.local`

## Uruchamianie aplikacji w trybie deweloperskim

```bash
# Uruchomienie serwera deweloperskiego
npm run dev

# lub
yarn dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

## Struktura projektu

```
groupshare-project/
├── docs/                                # Dokumentacja
├── src/                                 # Kod źródłowy aplikacji
│   ├── app/                             # Next.js App Router
│   │   ├── api/                         # API Routes
│   │   ├── (auth)/                      # Strony wymagające autentykacji
│   │   ├── (public)/                    # Strony publiczne
│   │   └── layout.js                    # Główny layout aplikacji
│   ├── components/                      # Komponenty React
│   │   ├── layout/                      # Komponenty layoutu
│   │   ├── ui/                          # Komponenty UI
│   │   └── [feature]/                   # Komponenty specyficzne dla funkcji
│   ├── lib/                             # Biblioteki i narzędzia
│   │   ├── supabase.js                  # Klient Supabase
│   │   ├── clerk.js                     # Konfiguracja Clerk
│   │   ├── stripe.js                    # Konfiguracja Stripe
│   │   └── utils.js                     # Funkcje pomocnicze
│   ├── hooks/                           # Hooki React
│   ├── context/                         # Konteksty React
│   └── styles/                          # Style globalne
└── public/                              # Statyczne pliki publiczne
```

## Narzędzia deweloperskie

### Skrypty npm/yarn

- `npm run dev` / `yarn dev` - uruchamia serwer deweloperski
- `npm run build` / `yarn build` - buduje aplikację do wdrożenia
- `npm run start` / `yarn start` - uruchamia zbudowaną aplikację
- `npm run lint` / `yarn lint` - sprawdza kod pod kątem błędów z ESLint
- `npm run format` / `yarn format` - formatuje kod z Prettier

### ESLint i Prettier

Projekt jest skonfigurowany z ESLint i Prettier dla spójnego stylu kodu:

- `.eslintrc.js` - konfiguracja ESLint
- `.prettierrc` - konfiguracja Prettier

Aby ręcznie uruchomić linting i formatowanie:

```bash
# Linting
npm run lint

# Formatowanie całego projektu
npm run format
```

### Husky i lint-staged

Projekt używa Husky do uruchamiania skryptów pre-commit, które sprawdzają kod przed zatwierdzeniem:

- Formatowanie zmienionego kodu z Prettier
- Uruchamianie lintingu na zmienionych plikach
- Sprawdzanie typów TypeScript

## Testowanie

### Testy jednostkowe

Projekt używa Jest i React Testing Library do testów jednostkowych:

```bash
# Uruchomienie wszystkich testów
npm run test

# Uruchomienie testów w trybie watch
npm run test:watch

# Sprawdzenie pokrycia testami
npm run test:coverage
```

### Testy E2E (opcjonalnie)

Dla testów end-to-end możesz użyć Cypress:

```bash
# Instalacja Cypress
npm install cypress --save-dev

# Uruchomienie Cypress
npx cypress open
```

## Zalecane przepływy pracy

### Tworzenie nowych funkcji

1. Utwórz nowy branch dla funkcji:
   ```bash
   git checkout -b feature/nazwa-funkcji
   ```

2. Zaimplementuj funkcję i dodaj testy

3. Uruchom testy, lint i formatowanie:
   ```bash
   npm run test
   npm run lint
   npm run format
   ```

4. Zatwierdź zmiany i wypchnij branch:
   ```bash
   git add .
   git commit -m "Dodano funkcję XYZ"
   git push origin feature/nazwa-funkcji
   ```

5. Utwórz Pull Request do głównego brancha

### Konwencje nazewnictwa

- **Brancha:**
  - `feature/nazwa-funkcji` - dla nowych funkcji
  - `fix/nazwa-błędu` - dla poprawek błędów
  - `chore/opis` - dla zadań utrzymaniowych
  - `docs/opis` - dla zmian w dokumentacji

- **Commit:**
  - Używaj konwencji conventional commits:
    - `feat: dodano XYZ`
    - `fix: naprawiono problem z ABC`
    - `chore: zaktualizowano zależności`
    - `docs: zaktualizowano README`

## Debugowanie

### Backend (API Routes)

Możesz dodać instrukcje `console.log` w API Routes, a logi będą wyświetlane w terminalu, w którym uruchomiono `npm run dev`.

Dla bardziej zaawansowanego debugowania, skonfiguruj VSCode:

1. Dodaj konfigurację w `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Next.js",
      "skipFiles": ["<node_internals>/**"],
      "port": 9229
    }
  ]
}
```

2. Uruchom aplikację w trybie debug:
```bash
NODE_OPTIONS='--inspect' npm run dev
```

3. Dołącz debugger VSCode

### Frontend

Używaj React DevTools dla przeglądarki do debugowania komponentów i stanu.

Dla komponentów możesz użyć:
```jsx
console.log('Component rendering:', props);
```

Dla kontekstów i hooków:
```jsx
useEffect(() => {
  console.log('State updated:', state);
}, [state]);
```

## Dodatkowe zasoby

- [Dokumentacja Next.js](https://nextjs.org/docs)
- [Dokumentacja Supabase](https://supabase.com/docs)
- [Dokumentacja Clerk](https://clerk.dev/docs)
- [Dokumentacja Tailwind CSS](https://tailwindcss.com/docs)
- [Dokumentacja Stripe](https://stripe.com/docs)

## Rozwiązywanie problemów

### Problemy z instalacją

Jeśli napotkasz problemy z instalacją pakietów:

```bash
rm -rf node_modules
rm package-lock.json # lub yarn.lock
npm cache clean --force
npm install
```

### Problemy z Supabase

Sprawdź, czy używasz właściwych kluczy i URL projektu:

```bash
npx supabase status --project-ref YOUR_PROJECT_REF
```

### Problemy z autentykacją

Sprawdź, czy zmienne środowiskowe Clerk są prawidłowo skonfigurowane oraz czy URL przekierowania jest poprawny w panelu Clerk.

## Kontakt

W przypadku pytań lub problemów z konfiguracją, skontaktuj się z:

- Główny deweloper: dev@groupshare.app
- Wsparcie techniczne: support@groupshare.app
