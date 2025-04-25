# Analiza warunków korzystania z platform subskrypcyjnych (POUFNE)

**DOKUMENT POUFNY - WYŁĄCZNIE DO UŻYTKU WEWNĘTRZNEGO**

Ten dokument zawiera szczegółową analizę warunków korzystania (ToS) różnych platform subskrypcyjnych pod kątem ograniczeń i możliwości udostępniania kont. Dokument jest przeznaczony wyłącznie do celów wewnętrznych i nie powinien być udostępniany publicznie ani klientom.

## Metodologia klasyfikacji

Platformy zostały sklasyfikowane według poziomu ryzyka dla naszego modelu biznesowego:

- **🟢 Niskie ryzyko** - platformy z liberalnymi zasadami udostępniania, bez aktywnego egzekwowania ograniczeń
- **🟡 Średnie ryzyko** - platformy z ograniczeniami, ale umiarkowaną weryfikacją
- **🔴 Wysokie ryzyko** - platformy z restrykcyjnymi zasadami i aktywną weryfikacją

## Szczegółowa analiza według platform

### 1. Netflix 🔴

**Wyciąg z warunków korzystania (aktualizacja: marzec 2025)**

> "Konto Netflix i zawarta w nim subskrypcja są przeznaczone do użytku osobistego przez Ciebie i członków Twojego gospodarstwa domowego."
> 
> "Gospodarstwo domowe to zbiór urządzeń używanych przez mieszkańców głównego miejsca zamieszkania."
> 
> "Aby zachować nieprzerwalny dostęp do Netfliksa, urządzenie musi połączyć się z Netfliksem w głównej lokalizacji co najmniej raz na 31 dni."

**Mechanizmy weryfikacji**
- Weryfikacja adresu IP
- Okresowa weryfikacja lokalizacji urządzeń
- Analiza wzorców korzystania
- Blokowanie VPN

**Konsekwencje naruszenia**
- Wymuszenie dodatkowej opłaty za użytkowników spoza gospodarstwa
- Wyłączenie dostępu dla urządzeń poza główną lokalizacją
- W skrajnych przypadkach: zawieszenie konta

**Poziom ryzyka: WYSOKI**
- Aktywne egzekwowanie ograniczeń
- Historia blokowania kont
- Brak elastyczności w definicji "gospodarstwa domowego"

**Konkluzja**
Netflix aktywnie zwalcza współdzielenie kont poza gospodarstwem domowym. Znaczące ryzyko dla naszego modelu biznesowego. **Rekomendacja: wprowadzić tylko z wyraźnymi zastrzeżeniami lub całkowicie wykluczyć z pierwszej fazy.**

### 2. Spotify Family 🔴

**Wyciąg z warunków korzystania (aktualizacja: styczeń 2025)**

> "Ty i członkowie Twojego gospodarstwa domowego (mieszkający pod tym samym adresem) możecie korzystać z Spotify Premium Family."
> 
> "Okresowo możemy prosić Cię o ponowną weryfikację adresu domowego."
> 
> "Zastrzegamy sobie prawo do zakończenia lub zawieszenia dostępu do usługi Spotify Premium Family w przypadku naruszenia niniejszych warunków."

**Mechanizmy weryfikacji**
- Wymaganie podania adresu podczas rejestracji
- Okresowe prośby o weryfikację lokalizacji
- Monitorowanie wzorców logowania

**Konsekwencje naruszenia**
- Początkowo: prośby o weryfikację
- Następnie: ograniczenie dostępu do funkcji
- Ostatecznie: zawieszenie planu rodzinnego

**Poziom ryzyka: WYSOKI**
- Coraz bardziej rygorystyczne egzekwowanie wspólnego adresu
- Aktywne wykorzystywanie danych geolokalizacyjnych
- Historia anulowania planów rodzinnych

**Konkluzja**
Spotify aktywnie weryfikuje, czy członkowie planu rodzinnego mieszkają pod tym samym adresem. **Rekomendacja: wykluczyć z pierwszej fazy lub wprowadzić tylko dla faktycznych członków gospodarstwa domowego.**

### 3. YouTube Premium Family 🟡

**Wyciąg z warunków korzystania (aktualizacja: luty 2025)**

> "Członkowie Twojej rodziny (w wieku 13 lat lub starsi) mieszkający pod tym samym adresem co Ty mogą dołączyć do Twojej grupy rodzinnej."
> 
> "Konieczne jest ustawienie lokalizacji rodziny, którą będą współdzielić wszyscy członkowie."
> 
> "Google może przeprowadzić weryfikację, aby upewnić się, że członkowie grupy spełniają wymagania dotyczące wieku i lokalizacji."

**Mechanizmy weryfikacji**
- Wymóg podania lokalizacji rodziny
- Weryfikacja podczas dołączania do grupy
- Mniej agresywne ciągłe monitorowanie

**Konsekwencje naruszenia**
- Ostrzeżenia
- Możliwość zawieszenia korzyści dla poszczególnych członków
- Rzadziej: rozwiązanie całego planu rodzinnego

**Poziom ryzyka: ŚREDNI**
- Mniej rygorystyczna weryfikacja niż Spotify/Netflix
- Mniej historii aktywnego egzekwowania (stan na 2025)
- Ale zwiększająca się tendencja do weryfikacji

**Konkluzja**
YouTube wymaga wspólnej lokalizacji, ale egzekwowanie jest mniej rygorystyczne. **Rekomendacja: możliwe do wprowadzenia w drugiej fazie, z odpowiednimi zastrzeżeniami.**

### 4. Apple One Family 🟡

**Wyciąg z warunków korzystania (aktualizacja: luty 2025)**

> "Udostępnianie rodzinne umożliwia Tobie i maksymalnie pięciu członkom rodziny korzystanie z tych usług Apple."
> 
> "Musisz mieć ukończone 18 lat, aby zostać organizatorem rodziny."
> 
> "Członkowie rodziny muszą mieć konta Apple ID i korzystać z najnowszej wersji iOS, iPadOS, macOS i tvOS."

**Mechanizmy weryfikacji**
- Powiązanie z systemem Family Sharing
- Wspólna metoda płatności
- Monitorowanie lokalizacji (mniej rygorystyczne)

**Konsekwencje naruszenia**
- Brak historii aktywnego egzekwowania
- Potencjalne zawieszenie dostępu do usług

**Poziom ryzyka: ŚREDNI**
- Apple skupia się bardziej na kwestiach wieku i płatności niż lokalizacji
- Mniej doniesień o zawieszeniach kont z powodu współdzielenia

**Konkluzja**
Apple ma mniej rygorystyczne podejście do weryfikacji wspólnego adresu. **Rekomendacja: możliwe do wprowadzenia z odpowiednimi ostrzeżeniami dla użytkowników.**

### 5. Microsoft 365 Family 🟢

**Wyciąg z warunków korzystania (aktualizacja: grudzień 2024)**

> "Możesz udostępnić swój plan Microsoft 365 Family maksymalnie 5 osobom."
> 
> "Każda osoba będzie miała własne konto Microsoft, z osobistym dostępem do korzyści z subskrypcji."
> 
> "Osoby te nie muszą należeć do tego samego gospodarstwa domowego."

**Mechanizmy weryfikacji**
- Brak wymogów wspólnego adresu
- Brak weryfikacji geograficznej
- Proste zaproszenia e-mail

**Konsekwencje naruszenia**
- Nie dotyczy - brak ograniczeń geograficznych

**Poziom ryzyka: NISKI**
- Brak egzekwowania wspólnego adresu
- Oficjalne wsparcie dla udostępniania poza gospodarstwem domowym

**Konkluzja**
Microsoft 365 Family oficjalnie pozwala na udostępnianie subskrypcji osobom spoza gospodarstwa domowego. **Rekomendacja: idealna platforma do pierwszej fazy wdrożenia.**

### 6. Nintendo Switch Online Family 🟢

**Wyciąg z warunków korzystania (aktualizacja: listopad 2024)**

> "Członkostwo rodzinne w Nintendo Switch Online umożliwia korzystanie z usługi maksymalnie 8 kontom użytkowników Nintendo."
> 
> "Wszystkie konta muszą być powiązane z tym samym krajem/regionem."
> 
> "Nie jest wymagane, aby członkowie rodziny byli spokrewnieni lub mieszkali pod tym samym adresem."

**Mechanizmy weryfikacji**
- Brak weryfikacji adresu
- Weryfikacja regionu (na poziomie kraju)
- Prosta weryfikacja kont

**Konsekwencje naruszenia**
- Nie dotyczy - brak ograniczeń dotyczących gospodarstwa domowego

**Poziom ryzyka: NISKI**
- Oficjalnie dozwolone udostępnianie poza gospodarstwem domowym
- Tylko regionalne ograniczenia

**Konkluzja**
Nintendo otwarcie pozwala na dzielenie się planem rodzinnym z dowolnymi osobami. **Rekomendacja: idealna platforma do pierwszej fazy wdrożenia.**

### 7. NordVPN 🟢

**Wyciąg z warunków korzystania (aktualizacja: luty 2025)**

> "Plan rodzinny NordVPN umożliwia korzystanie z serwisu na maksymalnie 6 urządzeniach jednocześnie."
> 
> "Każdy użytkownik otrzymuje indywidualne konto."
> 
> "Możesz udostępnić swój plan rodzinny przyjaciołom i rodzinie."

**Mechanizmy weryfikacji**
- Brak weryfikacji adresu
- Brak weryfikacji pokrewieństwa
- Tylko limit jednoczesnych połączeń

**Konsekwencje naruszenia**
- Nie dotyczy - brak ograniczeń dotyczących gospodarstwa domowego

**Poziom ryzyka: NISKI**
- Otwarcie pozwala na udostępnianie poza gospodarstwem domowym
- Brak historii egzekwowania ograniczeń

**Konkluzja**
NordVPN nie stawia ograniczeń co do wspólnego gospodarstwa domowego. **Rekomendacja: idealna platforma do pierwszej fazy wdrożenia.**

### 8. Amazon Prime 🟡

**Wyciąg z warunków korzystania (aktualizacja: marzec 2025)**

> "Prime Video Household pozwala na współdzielenie korzyści Prime Video z innymi osobami w Twoim gospodarstwie domowym."
> 
> "Możesz udostępnić korzyści Prime maksymalnie jednemu dorosłemu i czwórce dzieci w tym samym gospodarstwie domowym."
> 
> "Członkowie gospodarstwa domowego muszą mieć adresy dostawy w tym samym kraju."

**Mechanizmy weryfikacji**
- Weryfikacja adresu dostawy
- Ograniczona weryfikacja fizycznej lokalizacji
- Monitoring równoczesnych sesji

**Konsekwencje naruszenia**
- Ograniczenie dostępu do streamingu
- Potencjalne zawieszenie funkcji udostępniania

**Poziom ryzyka: ŚREDNI**
- Umiarkowane egzekwowanie ograniczeń
- Wzrastająca tendencja do weryfikacji
- Weryfikacja głównie w przypadku podejrzanej aktywności

**Konkluzja**
Amazon wymaga wspólnego gospodarstwa domowego, ale egzekwowanie jest umiarkowane. **Rekomendacja: możliwe do wprowadzenia w drugiej fazie z odpowiednimi zastrzeżeniami.**

## Rekomendacje dla różnych faz wdrożenia

### Faza 1 (MVP) - Platformy o niskim ryzyku
- Microsoft 365 Family ✅
- Nintendo Switch Online Family ✅
- NordVPN ✅

### Faza 2 - Platformy o średnim ryzyku
- YouTube Premium Family ⚠️
- Apple One Family ⚠️
- Amazon Prime ⚠️
- HBO Max ⚠️

### Faza 3 (opcjonalnie) - Platformy o wysokim ryzyku
- Spotify Family 🛑
- Netflix 🛑
- Disney+ 🛑

## Strategia komunikacji w aplikacji

Ze względu na ryzyko prawne i potencjalny negatywny wpływ na relacje z platformami, **NIE REKOMENDUJEMY** używania w aplikacji określeń "niskie/średnie/wysokie ryzyko" ani sugerowania, że zachęcamy do naruszania warunków korzystania.

**Zalecana alternatywna nomenklatura dla interfejsu aplikacji:**

| Wewnętrzna klasyfikacja | Publiczna komunikacja |
|------------------------|------------------------|
| 🟢 Niskie ryzyko | "Bardzo elastyczne zasady udostępniania" lub "Elastyczne zasady" |
| 🟡 Średnie ryzyko | "Standardowe zasady udostępniania" |
| 🔴 Wysokie ryzyko | "Wymagające zasady udostępniania" |

## Plan monitorowania zmian w ToS

Zalecamy regularne (kwartalne) aktualizacje tej analizy, ponieważ platformy często zmieniają swoje warunki korzystania i mechanizmy weryfikacji. Odpowiedzialny: [zespół prawny/analityczny].

## Zastrzeżenie

Niniejsza analiza ma charakter poglądowy i nie stanowi porady prawnej. Przed podjęciem jakichkolwiek działań biznesowych należy skonsultować się z prawnikiem specjalizującym się w prawie własności intelektualnej i usługach cyfrowych.

---

*Ostatnia aktualizacja: 15 kwietnia 2025*  
*Autor: [Zespół Analiz GroupShare]*  
*Poziom poufności: WYSOKI*
