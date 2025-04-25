# Wymagania funkcjonalne i niefunkcjonalne GroupShare

## Przegląd

Ten dokument definiuje wymagania funkcjonalne i niefunkcjonalne dla MVP (Minimum Viable Product) platformy GroupShare. Dokument służy jako podstawa do rozwoju, testowania i walidacji systemu.

## Wymagania funkcjonalne MVP

### 1. Zarządzanie użytkownikami

#### 1.1. Rejestracja i autentykacja
- **F1.1.1:** Użytkownicy mogą rejestrować się za pomocą adresu email lub konta Google/Facebook
- **F1.1.2:** Użytkownicy mogą logować się za pomocą hasła lub metod uwierzytelniania dwuskładnikowego
- **F1.1.3:** Użytkownicy mogą resetować hasło przez email
- **F1.1.4:** System wykorzystuje Clerk.dev do zarządzania autentykacją

#### 1.2. Profil użytkownika
- **F1.2.1:** Użytkownicy mogą edytować swój profil (imię, avatar, opis)
- **F1.2.2:** Użytkownicy mogą ustawić preferowane metody płatności
- **F1.2.3:** Użytkownicy mogą przeglądać historię swoich transakcji
- **F1.2.4:** Użytkownicy mogą zarządzać powiadomieniami

### 2. Zarządzanie grupami

#### 2.1. Tworzenie i zarządzanie grupami
- **F2.1.1:** Użytkownicy mogą tworzyć nowe grupy subskrypcyjne
- **F2.1.2:** Właściciele grup mogą zapraszać innych użytkowników
- **F2.1.3:** Właściciele grup mogą zarządzać członkami (usuwać, zmieniać role)
- **F2.1.4:** Użytkownicy mogą przeglądać grupy, do których należą

#### 2.2. Funkcje grup
- **F2.2.1:** Członkowie grupy mogą komunikować się przez wbudowany czat
- **F2.2.2:** Grupy zawierają panel z informacjami o aktywnych subskrypcjach
- **F2.2.3:** System automatycznie przypomina o nadchodzących płatnościach

### 3. Zarządzanie subskrypcjami

#### 3.1. Tworzenie ofert subskrypcji
- **F3.1.1:** Użytkownicy mogą tworzyć oferty współdzielenia subskrypcji
- **F3.1.2:** Użytkownicy mogą określić liczbę dostępnych miejsc
- **F3.1.3:** Użytkownicy mogą ustalić cenę za miejsce
- **F3.1.4:** Użytkownicy mogą określić czy oferta zawiera natychmiastowy dostęp

#### 3.2. Przeglądanie i aplikowanie o subskrypcje
- **F3.2.1:** Użytkownicy mogą przeglądać dostępne oferty subskrypcji
- **F3.2.2:** Użytkownicy mogą filtrować oferty według platformy, ceny, dostępności
- **F3.2.3:** Użytkownicy mogą aplikować o miejsce w subskrypcji
- **F3.2.4:** Właściciele subskrypcji mogą akceptować lub odrzucać aplikacje

### 4. System natychmiastowego dostępu

#### 4.1. Zarządzanie instrukcjami dostępu
- **F4.1.1:** Właściciele mogą dodawać zaszyfrowane instrukcje dostępu
- **F4.1.2:** System bezpiecznie przechowuje instrukcje dostępu (szyfrowanie asymetryczne)
- **F4.1.3:** Dostęp do instrukcji jest przyznawany tylko po potwierdzeniu płatności

#### 4.2. System tokenów dostępu
- **F4.2.1:** System generuje jednorazowe tokeny dostępu
- **F4.2.2:** Tokeny wygasają po ustalonym czasie (domyślnie 30 minut)
- **F4.2.3:** System śledzi wykorzystanie tokenów

### 5. System płatności

#### 5.1. Obsługa płatności
- **F5.1.1:** System integruje się z PayU dla płatności BLIK
- **F5.1.2:** System integruje się ze Stripe dla płatności kartami
- **F5.1.3:** System obsługuje natychmiastowe potwierdzenia płatności
- **F5.1.4:** System nalicza prowizje zgodnie z polityką monetyzacji

#### 5.2. Zarządzanie transakcjami
- **F5.2.1:** System rejestruje wszystkie transakcje
- **F5.2.2:** System automatycznie rozlicza prowizje
- **F5.2.3:** Użytkownicy mogą generować raporty swoich transakcji
- **F5.2.4:** System obsługuje zwroty w przypadku problemów

### 6. Oceny i feedback

#### 6.1. System ocen użytkowników
- **F6.1.1:** Użytkownicy mogą oceniać siebie nawzajem po transakcji
- **F6.1.2:** Oceny obejmują jakość dostępu, komunikację, niezawodność
- **F6.1.3:** System oblicza średnie oceny dla użytkowników

#### 6.2. Zgłaszanie problemów
- **F6.2.1:** Użytkownicy mogą zgłaszać problemy z dostępem
- **F6.2.2:** Użytkownicy mogą zgłaszać niewłaściwe zachowania innych użytkowników
- **F6.2.3:** System zapewnia prosty proces mediacji

## Wymagania niefunkcjonalne

### 1. Bezpieczeństwo

#### 1.1. Ochrona danych
- **NF1.1.1:** System musi szyfrować wszystkie wrażliwe dane (instrukcje dostępu, dane płatności)
- **NF1.1.2:** System musi używać szyfrowania asymetrycznego dla instrukcji dostępu
- **NF1.1.3:** Klucze prywatne muszą być przechowywane w bezpiecznym vault
- **NF1.1.4:** System musi być zgodny z RODO/GDPR

#### 1.2. Kontrola dostępu
- **NF1.2.1:** System musi implementować Row Level Security (RLS) w Supabase
- **NF1.2.2:** System musi zapewniać szczegółowe uprawnienia na poziomie użytkownik/grupa
- **NF1.2.3:** System musi ograniczać dostęp do API tylko dla uwierzytelnionych użytkowników
- **NF1.2.4:** System musi implementować mechanizmy zapobiegające atakom (CSRF, XSS, SQL Injection)

### 2. Wydajność

#### 2.1. Czas odpowiedzi
- **NF2.1.1:** Strony muszą ładować się w czasie poniżej 2 sekund (95. percentyl)
- **NF2.1.2:** API musi odpowiadać w czasie poniżej 300ms (95. percentyl)
- **NF2.1.3:** Operacje na bazie danych muszą wykonywać się w czasie poniżej 100ms (95. percentyl)

#### 2.2. Skalowalność
- **NF2.2.1:** System musi obsługiwać co najmniej 1000 równoczesnych użytkowników
- **NF2.2.2:** System musi obsługiwać co najmniej 100 transakcji na minutę
- **NF2.2.3:** System musi być skalowalny horyzontalnie w miarę wzrostu liczby użytkowników

### 3. Dostępność i niezawodność

#### 3.1. Dostępność
- **NF3.1.1:** System musi być dostępny przez 99.9% czasu (downtime < 43 minuty miesięcznie)
- **NF3.1.2:** System musi obsługiwać planowane przerwy konserwacyjne poza godzinami szczytu
- **NF3.1.3:** Krytyczne komponenty muszą mieć redundancję

#### 3.2. Odporność na błędy
- **NF3.2.1:** System musi implementować mechanizmy retry dla operacji płatności
- **NF3.2.2:** System musi gracefully degradować funkcjonalność w przypadku awarii
- **NF3.2.3:** System musi posiadać plany odtwarzania po awarii (DRP)

### 4. Użyteczność

#### 4.1. Interfejs użytkownika
- **NF4.1.1:** UI musi być responsywny i działać na urządzeniach mobilnych i desktopowych
- **NF4.1.2:** UI musi być zgodny z wytycznymi dostępności WCAG 2.1 AA
- **NF4.1.3:** UI musi być intuicyjny i minimalizować liczbę kroków w kluczowych procesach

#### 4.2. Internacjonalizacja
- **NF4.2.1:** System musi obsługiwać język polski w MVP
- **NF4.2.2:** System musi być zaprojektowany z myślą o późniejszej łatwej lokalizacji
- **NF4.2.3:** System musi obsługiwać formatowanie dat, walut i liczb zgodnie z lokalizacją

### 5. Zgodność i standardy

#### 5.1. Zgodność prawna
- **NF5.1.1:** System musi być zgodny z przepisami o ochronie danych osobowych (RODO/GDPR)
- **NF5.1.2:** System musi być zgodny z przepisami o usługach płatniczych
- **NF5.1.3:** System musi być transparentny co do warunków korzystania z platform

#### 5.2. Standardy techniczne
- **NF5.2.1:** Frontend musi być zgodny ze standardami HTML5, CSS3 i ECMAScript
- **NF5.2.2:** API musi być zgodne z zasadami REST
- **NF5.2.3:** Kod musi przechodzić automatyczne testy i code review przed deployment

## Ograniczenia

1. System będzie wykorzystywał Supabase jako bazę danych i backend
2. System będzie używał Clerk.dev do autentykacji
3. System będzie hostowany na Vercel
4. MVP będzie obsługiwał początkowo 5 wybranych platform subskrypcyjnych
5. System będzie skupiał się na rynku polskim w fazie MVP

## Kryteria akceptacji MVP

System zostanie uznany za gotowy do wydania MVP, gdy:
1. Wszystkie wymagania funkcjonalne oznaczone jako część MVP zostaną zaimplementowane
2. System będzie spełniał kluczowe wymagania niefunkcjonalne, szczególnie w zakresie bezpieczeństwa i wydajności
3. Zostaną przeprowadzone testy użyteczności potwierdzające intuicyjność głównych ścieżek użytkownika
4. Zostaną przeprowadzone testy bezpieczeństwa potwierdzające ochronę wrażliwych danych
5. Dokumentacja użytkownika i prawna będzie gotowa

---

*Ostatnia aktualizacja: 1 kwietnia 2025*  
*Autor: Zespół GroupShare*  
*Wersja: 1.0*