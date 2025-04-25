| Kategoria | Test | Cel | Narzędzie |
|-----------|------|-----|-----------|
| **Zasady Warstw** | Warstwa domenowa nie zależy od innych warstw | Weryfikacja czystości domeny | dependency-cruiser |
| | Warstwa aplikacji zależy tylko od domeny | Weryfikacja jednokierunkowej zależności | dependency-cruiser |
| | Warstwa infrastruktury zależy tylko od domeny i aplikacji | Weryfikacja poprawności zależności | dependency-cruiser |
| | Warstwa interfejsu może zależeć od wszystkich innych warstw | Weryfikacja poprawności zależności | dependency-cruiser |
| **Granice Kontekstu** | Konteksty biznesowe nie zależą od siebie bezpośrednio | Weryfikacja granic kontekstu | dependency-cruiser + custom tests |
| | Komunikacja między kontekstami odbywa się przez translatory lub serwisy | Weryfikacja czystości integracji | ESLint rules + static analysis |
| **Reguły Encji** | Encje nie mają zależności zewnętrznych | Weryfikacja czystości encji | Jest + custom tests |
| | Encje zawierają logikę biznesową | Weryfikacja zasad DDD | Jest + custom tests |
| **Reguły Repozytoriów** | Repozytoria implementują odpowiednie interfejsy | Weryfikacja zgodności interfejsów | TypeScript compilation |
| | Implementacja repozytoriów jest w warstwie infrastruktury | Weryfikacja podziału warstw | dependency-cruiser |
| **Reguły Przypadków Użycia** | Przypadki użycia korzystają tylko z interfejsów repozytoriów | Weryfikacja zasady inversji zależności | dependency-cruiser + custom rules |
| | Przypadki użycia korzystają tylko z encji i serwisów | Weryfikacja zasad czystej architektury | dependency-cruiser + custom rules |
| **Reguły UI** | Komponenty UI nie zawierają logiki biznesowej | Weryfikacja separacji warstw | ESLint rules + Jest |
| | Komponenty UI odpowiadają tylko za prezentację | Weryfikacja separacji odpowiedzialności | ESLint rules + Jest |
| **Reguły API** | Kontrolery API korzystają tylko z warstwy aplikacji | Weryfikacja separacji warstw | dependency-cruiser |
| | Kontrolery API nie zawierają logiki biznesowej | Weryfikacja separacji odpowiedzialności | ESLint rules + Jest |
| **Analiza Statyczna** | Wykrywanie nieprawidłowych zależności | Weryfikacja architektoniczna | SonarQube + ArchUnit |
| | Wykrywanie naruszeń granic warstw | Weryfikacja integralności warstw | ESLint + custom rules |
| **Analiza Dynamiczna** | Weryfikacja przepływu danych między warstwami | Weryfikacja działania w runtime | Jest + custom assertions |
| | Weryfikacja obsługi błędów między warstwami | Weryfikacja odporności architektury | Jest + custom assertions |
