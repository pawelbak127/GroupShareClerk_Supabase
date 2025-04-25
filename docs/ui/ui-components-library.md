# Biblioteka komponentów UI GroupShare

Ten dokument zawiera specyfikację komponentów UI dla aplikacji GroupShare, zgodną z wytycznymi brandingowymi. Biblioteka komponentów została zaprojektowana z myślą o spójności, dostępności i łatwości użycia.

## Filozofia designu

Nasz system designu opiera się na następujących zasadach:
- **Przejrzystość** - komponenty powinny być intuicyjne i zrozumiałe
- **Spójność** - jednolity wygląd i zachowanie w całej aplikacji
- **Dostępność** - zgodność z WCAG 2.1 AA
- **Responsywność** - poprawne działanie na wszystkich urządzeniach
- **Modularność** - możliwość łatwego łączenia komponentów

## Implementacja techniczna

Biblioteka komponentów jest zbudowana przy użyciu:
- React i TypeScript
- Tailwind CSS dla stylizacji
- Headless UI dla dostępnych komponentów bazowych
- Framer Motion dla animacji

## 1. Typografia

### 1.1. Fonty

Główny font: **Inter**

```jsx
// Przykład importu fontów w Next.js
// W pliku layout.js
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export default function RootLayout({ children }) {
  return (
    <html lang="pl" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### 1.2. Hierarchia nagłówków

```jsx
// Nagłówek H1
<h1 className="text-4xl font-bold text-gray-900 tracking-tight md:text-5xl">
  Nagłówek poziomu 1
</h1>

// Nagłówek H2
<h2 className="text-3xl font-bold text-gray-900 mb-4">
  Nagłówek poziomu 2
</h2>

// Nagłówek H3
<h3 className="text-xl font-bold text-gray-900 mb-2">
  Nagłówek poziomu 3
</h3>

// Nagłówek H4
<h4 className="text-lg font-semibold text-gray-900 mb-2">
  Nagłówek poziomu 4
</h4>
```

### 1.3. Tekst podstawowy

```jsx
// Tekst podstawowy
<p className="text-base text-gray-600">
  Przykładowy tekst podstawowy.
</p>

// Tekst mały
<p className="text-sm text-gray-500">
  Mniejszy tekst pomocniczy.
</p>

// Tekst wyróżniony
<p className="text-base font-medium text-gray-700">
  Tekst o większej wadze wizualnej.
</p>
```

## 2. Kolory

### 2.1. Kolory podstawowe

```jsx
// Kolor primary
<div className="bg-indigo-600">Indigo Primary</div>

// Kolor primary dark
<div className="bg-indigo-700">Indigo Dark</div>

// Kolor primary light
<div className="bg-indigo-100">Indigo Light</div>
```

### 2.2. Kolory neutralne

```jsx
// Kolor tekstu głównego
<p className="text-gray-900">Tekst główny</p>

// Kolor tekstu pomocniczego
<p className="text-gray-600">Tekst pomocniczy</p>

// Kolor tekstu wyciszonego
<p className="text-gray-400">Tekst wyciszony</p>

// Tło podstawowe
<div className="bg-white">Białe tło</div>

// Tło alternatywne
<div className="bg-gray-50">Szare tło</div>
```

### 2.3. Kolory funkcjonalne

```jsx
// Sukces
<div className="bg-green-100 text-green-800">Sukces</div>

// Ostrzeżenie
<div className="bg-yellow-100 text-yellow-800">Ostrzeżenie</div>

// Błąd
<div className="bg-red-100 text-red-800">Błąd</div>

// Informacja
<div className="bg-blue-100 text-blue-800">Informacja</div>
```

## 3. Przyciski

### 3.1. Warianty przycisków

```jsx
// Primary Button
<button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
  Przycisk Primary
</button>

// Secondary Button
<button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
  Przycisk Secondary
</button>

// Tertiary Button (Link)
<button className="font-medium text-indigo-600 hover:text-indigo-800">
  Przycisk Tertiary
</button>

// Danger Button
<button className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
  Przycisk Danger
</button>
```

### 3.2. Rozmiary przycisków

```jsx
// Large
<button className="px-6 py-3 bg-indigo-600 text-white font-medium text-lg rounded-md">
  Duży przycisk
</button>

// Medium (default)
<button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md">
  Średni przycisk
</button>

// Small
<button className="px-3 py-1 bg-indigo-600 text-white font-medium text-sm rounded-md">
  Mały przycisk
</button>
```

### 3.3. Stany przycisków

```jsx
// Disabled
<button className="px-4 py-2 bg-indigo-300 text-white font-medium rounded-md cursor-not-allowed" disabled>
  Przycisk nieaktywny
</button>

// Loading
<button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md flex items-center">
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  Ładowanie...
</button>

// With Icon
<button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md inline-flex items-center">
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
  Z ikoną
</button>
```

## 4. Formularze

### 4.1. Pola tekstowe

```jsx
// Standardowe pole tekstowe
<div className="mb-4">
  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
    Nazwa
  </label>
  <input
    type="text"
    id="name"
    name="name"
    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
    placeholder="Wprowadź nazwę"
  />
</div>

// Pole z błędem
<div className="mb-4">
  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
    Email
  </label>
  <input
    type="email"
    id="email"
    name="email"
    className="block w-full rounded-md border border-red-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
    placeholder="Wprowadź email"
  />
  <p className="mt-1 text-sm text-red-600">Nieprawidłowy format adresu email.</p>
</div>

// Pole z sukcesem
<div className="mb-4">
  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
    Nazwa użytkownika
  </label>
  <input
    type="text"
    id="username"
    name="username"
    className="block w-full rounded-md border border-green-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
    placeholder="Wprowadź nazwę użytkownika"
  />
  <p className="mt-1 text-sm text-green-600">Nazwa użytkownika jest dostępna.</p>
</div>
```

### 4.2. Textarea

```jsx
<div className="mb-4">
  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
    Opis
  </label>
  <textarea
    id="description"
    name="description"
    rows="4"
    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
    placeholder="Wprowadź opis"
  ></textarea>
</div>
```

### 4.3. Select

```jsx
<div className="mb-4">
  <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
    Platforma
  </label>
  <select
    id="platform"
    name="platform"
    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
  >
    <option value="">Wybierz platformę</option>
    <option value="microsoft-365">Microsoft 365 Family</option>
    <option value="nintendo-switch">Nintendo Switch Online</option>
    <option value="youtube-premium">YouTube Premium</option>
  </select>
</div>
```

### 4.4. Checkbox i Radio

```jsx
// Checkbox
<div className="mb-4">
  <div className="flex items-start">
    <div className="flex items-center h-5">
      <input
        id="terms"
        name="terms"
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
      />
    </div>
    <div className="ml-3 text-sm">
      <label htmlFor="terms" className="font-medium text-gray-700">
        Akceptuję regulamin
      </label>
      <p className="text-gray-500">Zgadzam się na warunki korzystania z usługi.</p>
    </div>
  </div>
</div>

// Radio
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Wybierz typ konta
  </label>
  <div className="space-y-2">
    <div className="flex items-center">
      <input
        id="account-owner"
        name="account-type"
        type="radio"
        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
      />
      <label htmlFor="account-owner" className="ml-3 block text-sm font-medium text-gray-700">
        Właściciel subskrypcji
      </label>
    </div>
    <div className="flex items-center">
      <input
        id="account-member"
        name="account-type"
        type="radio"
        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
      />
      <label htmlFor="account-member" className="ml-3 block text-sm font-medium text-gray-700">
        Szukam subskrypcji
      </label>
    </div>
  </div>
</div>
```

## 5. Karty (Cards)

### 5.1. Karta podstawowa

```jsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <h3 className="text-lg font-bold text-gray-900 mb-2">Tytuł karty</h3>
  <p className="text-gray-600 mb-4">Zawartość karty z podstawowymi informacjami.</p>
  <button className="text-indigo-600 font-medium hover:text-indigo-800">
    Akcja
  </button>
</div>
```

### 5.2. Karta oferty subskrypcji

```jsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <div className="p-6">
    <div className="flex items-center mb-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
        <span className="text-xs text-gray-500">Logo</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Microsoft 365 Family</h3>
        <div className="flex items-center mt-1">
          <span className="text-sm text-gray-600 mr-2">
            Elastyczne zasady
          </span>
          <span className="text-sm">✨</span>
        </div>
      </div>
    </div>
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-gray-600">Cena za miejsce</span>
        <span className="font-medium text-gray-900">29 PLN / mies.</span>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-600">Dostępne miejsca</span>
        <span className="font-medium text-gray-900">3 / 5</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Natychmiastowy dostęp</span>
        <span className="font-medium text-green-600">Tak</span>
      </div>
    </div>
    <p className="text-gray-600 text-sm mb-4">
      Udostępniam miejsca w Microsoft 365 Family. Szybka aktywacja.
    </p>
  </div>
  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
      <span className="text-sm font-medium text-gray-700">Michał K.</span>
    </div>
    <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700">
      Dołącz
    </button>
  </div>
</div>
```

### 5.3. Karta grupy

```jsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <div className="p-6">
    <h3 className="text-lg font-bold text-gray-900 mb-2">Grupa Współlokatorzy</h3>
    <div className="flex items-center mb-4">
      <div className="flex -space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white"></div>
        <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white"></div>
        <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-white"></div>
      </div>
      <span className="ml-2 text-sm text-gray-600">3 członków</span>
    </div>
    <div className="space-y-2 mb-4">
      <div className="flex items-center">
        <span className="w-4 h-4 text-indigo-600 mr-2">✓</span>
        <span className="text-sm text-gray-600">Microsoft 365 Family</span>
      </div>
      <div className="flex items-center">
        <span className="w-4 h-4 text-indigo-600 mr-2">✓</span>
        <span className="text-sm text-gray-600">YouTube Premium</span>
      </div>
    </div>
  </div>
  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between">
    <button className="text-indigo-600 font-medium hover:text-indigo-800">
      Szczegóły
    </button>
    <button className="text-indigo-600 font-medium hover:text-indigo-800">
      Zarządzaj
    </button>
  </div>
</div>
```

## 6. Powiadomienia

### 6.1. Alert

```jsx
// Success
<div className="rounded-md bg-green-50 p-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium text-green-800">
        Operacja zakończona sukcesem.
      </p>
    </div>
  </div>
</div>

// Error
<div className="rounded-md bg-red-50 p-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium text-red-800">
        Wystąpił błąd podczas przetwarzania.
      </p>
    </div>
  </div>
</div>

// Info
<div className="rounded-md bg-blue-50 p-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium text-blue-800">
        Informacja: Ta platform wymaga wspólnego adresu.
      </p>
    </div>
  </div>
</div>

// Warning
<div className="rounded-md bg-yellow-50 p-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <p className="text-sm font-medium text-yellow-800">
        Uwaga: Twoja subskrypcja wygasa za 3 dni.
      </p>
    </div>
  </div>
</div>
```

### 6.2. Toast

```jsx
// Przykład komponentu Toast
function Toast({ type, message, onClose }) {
  const icons = {
    success: (
      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  };

  const bgColors = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50'
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800'
  };

  return (
    <div className={`rounded-md ${bgColors[type]} p-4 shadow-md`}>
      <div className="flex justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${textColors[type]}`}>
              {message}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={onClose}
        >
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

## 7. Nawigacja

### 7.1. Główna nawigacja

```jsx
<nav className="bg-white shadow">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16">
      <div className="flex">
        <div className="flex-shrink-0 flex items-center">
          <span className="text-xl font-bold text-indigo-600">GroupShare</span>
        </div>
        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
          <a href="#" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
            Dashboard
          </a>
          <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
            Moje grupy
          </a>
          <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
            Przeglądaj oferty
          </a>
          <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
            Zarządzaj subskrypcjami
          </a>
        </div>
      </div>
      <div className="hidden sm:ml-6 sm:flex sm:items-center">
        <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <div className="ml-3 relative">
          <div>
            <button className="bg-white rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <div className="h-8 w-8 rounded-full bg-gray-200"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</nav>
```

### 7.2. Sidebar

```jsx
<div className="h-screen flex overflow-hidden">
  <div className="w-64 bg-indigo-700 text-white">
    <div className="h-16 flex items-center px-4">
      <span className="text-xl font-bold">GroupShare</span>
    </div>
    <nav className="mt-5 px-2">
      <a href="#" className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-indigo-800 text-white">
        <svg className="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Dashboard
      </a>
      <a href="#" className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-indigo-100 hover:bg-indigo-600">
        <svg className="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Moje grupy
      </a>
      <a href="#" className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-indigo-100 hover:bg-indigo-600">
        <svg className="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Przeglądaj oferty
      </a>
      <a href="#" className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-indigo-100 hover:bg-indigo-600">
        <svg className="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Płatności
      </a>
    </nav>
  </div>
  <div className="flex-1 overflow-auto">
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Zawartość strony */}
        </div>
      </div>
    </div>
  </div>
</div>
```

## 8. Ikony platformy z oznaczeniami wymagań

```jsx
// Komponent ikony platformy z oznaczeniem wymagań
function PlatformIcon({ platform, requirementIcon, requirementText }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
        <span className="text-xs">{platform.charAt(0)}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{platform}</span>
      <div className="flex items-center mt-1">
        <span className="text-xs text-gray-600">{requirementText}</span>
        <span className="ml-1">{requirementIcon}</span>
      </div>
    </div>
  );
}

// Przykłady użycia
<div className="flex space-x-6">
  <PlatformIcon
    platform="Microsoft 365"
    requirementIcon="✨"
    requirementText="Elastyczne zasady"
  />
  
  <PlatformIcon
    platform="Netflix"
    requirementIcon="🏠"
    requirementText="Wymagający wspólny adres"
  />
  
  <PlatformIcon
    platform="YouTube Premium"
    requirementIcon="✓"
    requirementText="Standardowe zasady"
  />
</div>
```

## 9. Komponenty specyficzne dla aplikacji

### 9.1. Panel wymagań platformy

```jsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <div className="flex items-center mb-4">
    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
      <span className="text-xs">M</span>
    </div>
    <h3 className="text-lg font-bold text-gray-900">Microsoft 365 Family</h3>
  </div>
  
  <div className="mb-4 pb-4 border-b border-gray-200">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Wymagania platformy:</h4>
    <div className="space-y-2">
      <div className="flex items-start">
        <span className="flex-shrink-0 text-green-500 mr-2">✓</span>
        <span className="text-sm text-gray-600">Brak wymogu wspólnego adresu</span>
      </div>
      <div className="flex items-start">
        <span className="flex-shrink-0 text-green-500 mr-2">✓</span>
        <span className="text-sm text-gray-600">Oficjalnie umożliwia udostępnianie do 5 osobom</span>
      </div>
      <div className="flex items-start">
        <span className="flex-shrink-0 text-green-500 mr-2">✓</span>
        <span className="text-sm text-gray-600">Każdy użytkownik ma własne konto Microsoft</span>
      </div>
    </div>
  </div>
  
  <div>
    <h4 className="text-sm font-medium text-gray-700 mb-2">Zalecenia:</h4>
    <p className="text-sm text-gray-600">
      Ta platforma oferuje elastyczne zasady udostępniania i jest idealna do dzielenia się w grupie.
    </p>
  </div>
</div>
```

### 9.2. Wskaźnik postępu transakcji

```jsx
<div className="space-y-4">
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-gray-700">Status transakcji</h4>
      <span className="text-sm text-green-600">3/5 ukończone</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
    </div>
  </div>
  
  <div className="space-y-3">
    <div className="flex items-center">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="text-sm text-gray-600">Aplikacja zaakceptowana</span>
    </div>
    
    <div className="flex items-center">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="text-sm text-gray-600">Płatność zrealizowana</span>
    </div>
    
    <div className="flex items-center">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="text-sm text-gray-600">Instrukcje udostępnione</span>
    </div>
    
    <div className="flex items-center">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mr-3">
        <span className="w-4 h-4 flex items-center justify-center">4</span>
      </div>
      <span className="text-sm text-gray-600">Dostęp potwierdzony</span>
    </div>
    
    <div className="flex items-center">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mr-3">
        <span className="w-4 h-4 flex items-center justify-center">5</span>
      </div>
      <span className="text-sm text-gray-600">Transakcja zakończona</span>
    </div>
  </div>
</div>
```

## 10. Dostępność i inkluzywność

Wszystkie komponenty powinny być zgodne z WCAG 2.1 AA. Kluczowe praktyki:

1. Używaj odpowiedniego kontrastu tekstu (minimum 4.5:1 dla tekstu standardowego)
2. Zapewnij obsługę klawiatury dla wszystkich interaktywnych elementów
3. Używaj semantycznych tagów HTML
4. Dodawaj etykiety dla pól formularzy
5. Zapewnij alternatywne opisy dla obrazów i ikon
6. Testuj z czytnikami ekranowymi (NVDA, VoiceOver)

## 11. Przykład organizacji kodu komponentów

```jsx
// src/components/Button/Button.tsx
import React, { ButtonHTMLAttributes } from 'react';
import classNames from 'classnames';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-indigo-500',
  tertiary: 'text-indigo-600 hover:text-indigo-800 bg-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

const sizeClasses = {
  small: 'px-3 py-1 text-sm',
  medium: 'px-4 py-2',
  large: 'px-6 py-3 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...rest
}) => {
  const baseClasses = 'font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center';
  
  const buttonClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      'opacity-50 cursor-not-allowed': disabled || isLoading,
    },
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
```

## Podsumowanie

Ta biblioteka komponentów stanowi fundament interfejsu użytkownika aplikacji GroupShare. Wszystkie komponenty są zgodne z wytycznymi brandingowymi i zaprojektowane z myślą o dostępności oraz skalowalności. Przy tworzeniu nowych komponentów należy kierować się tymi samymi zasadami, aby zachować spójność wizualną i funkcjonalną w całej aplikacji.
