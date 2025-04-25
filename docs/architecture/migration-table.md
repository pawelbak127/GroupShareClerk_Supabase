| Obecna Lokalizacja | Docelowa Lokalizacja | Poziom Trudności (1-5) | Komentarz |
|---------------------|---------------------|------------------------|-----------|
| **Warstwa API** |
| `/src/app/api/auth/profile/route.js` | `/src/interface/api/controllers/UserController.ts`<br>`/src/application/user/useCases/` | 3 | Rozdzielić logikę biznesową od obsługi API |
| `/src/app/api/access/[id]/route.js` | `/src/interface/api/controllers/AccessController.ts`<br>`/src/application/access/useCases/` | 4 | Złożona logika weryfikacji tokenów |
| `/src/app/api/application/route.js` | `/src/interface/api/controllers/ApplicationController.ts` | 2 | |
| `/src/app/api/groups/[id]/route.js` | `/src/interface/api/controllers/GroupController.ts`<br>`/src/application/group/useCases/` | 3 | |
| `/src/app/api/groups/route.js` | `/src/interface/api/controllers/GroupController.ts`<br>`/src/application/group/useCases/` | 3 | |
| `/src/app/api/offers/[id]/purchase/route.js` | `/src/interface/api/controllers/PurchaseController.ts`<br>`/src/application/purchase/useCases/` | 3 | |
| `/src/app/api/offers/[id]/route.js` | `/src/interface/api/controllers/OfferController.ts`<br>`/src/application/subscription/useCases/` | 4 | Złożona logika biznesowa |
| `/src/app/api/offers/route.js` | `/src/interface/api/controllers/OfferController.ts`<br>`/src/application/subscription/useCases/` | 4 | |
| `/src/app/api/payments/route.js` | `/src/interface/api/controllers/PaymentController.ts`<br>`/src/application/payment/useCases/` | 3 | |
| `/src/app/api/payment-gateway/webhook/route.js` | `/src/interface/api/controllers/PaymentWebhookController.ts` | 2 | |
| `/src/app/api/platforms/route.js` | `/src/interface/api/controllers/PlatformController.ts` | 1 | Prosta migracja |
| `/src/app/api/purchases/[id]/confirm-access/route.js` | `/src/interface/api/controllers/PurchaseController.ts`<br>`/src/application/purchase/useCases/` | 3 | |
| `/src/app/api/purchases/[id]/route.js` | `/src/interface/api/controllers/PurchaseController.ts`<br>`/src/application/purchase/useCases/` | 2 | |

| **Warstwa Biblioteki i Usługi** |
| `/src/lib/database/supabase-admin-client.js` | `/src/infrastructure/persistence/supabase/SupabaseAdminClient.ts` | 2 | |
| `/src/lib/database/supabase-client.js` | `/src/infrastructure/persistence/supabase/SupabaseClient.ts`<br>`/src/infrastructure/persistence/supabase/repositories/` | 4 | Wydzielić repozytoria |
| `/src/lib/api/error-handler.js` | `/src/interface/api/middlewares/ErrorMiddleware.ts`<br>`/src/application/shared/ApplicationException.ts` | 2 | |
| `/src/lib/security/encryption/encryption-service.js` | `/src/infrastructure/security/encryption/EncryptionService.ts`<br>`/src/domain/shared/services/EncryptionService.ts` (interfejs) | 3 | |
| `/src/lib/security/key-management-service.js` | `/src/infrastructure/security/encryption/KeyManagementService.ts` | 3 | |
| `/src/lib/security/token-service.js` | `/src/infrastructure/security/tokenization/TokenService.ts`<br>`/src/domain/access/services/TokenService.ts` (interfejs) | 4 | |
| `/src/lib/utils/notification.js` | `/src/interface/web/utils/notification.ts` | 1 | |
| `/src/services/offer/offer-service.js` | `/src/application/subscription/SubscriptionApplicationService.ts`<br>`/src/domain/subscription/services/` | 5 | Kompleksowa dekompozycja |
| `/src/services/payment/payment-service.js` | `/src/application/payment/PaymentApplicationService.ts`<br>`/src/domain/payment/services/` | 5 | Kompleksowa dekompozycja |

| **Warstwa Komponentów UI** |
| `/src/components/auth/LoginRedirect.jsx` | `/src/interface/web/components/auth/LoginRedirect.tsx` | 1 | |
| `/src/components/common/*.jsx` | `/src/interface/web/components/common/*.tsx` | 1 | |
| `/src/components/forms/*.jsx` | `/src/interface/web/components/forms/*.tsx` | 2 | |
| `/src/components/layout/*.js` | `/src/interface/web/components/layout/*.tsx` | 1 | |
| `/src/components/offers/CreateOfferForm.jsx` | `/src/interface/web/components/offers/CreateOfferForm.tsx` | 3 | Wydzielić logikę biznesową |
| `/src/components/offers/EditOfferForm.jsx` | `/src/interface/web/components/offers/EditOfferForm.tsx` | 3 | Wydzielić logikę biznesową |
| `/src/components/offers/FilterBar.jsx` | `/src/interface/web/components/offers/FilterBar.tsx` | 2 | |
| `/src/components/offers/OfferCard.jsx` | `/src/interface/web/components/offers/OfferCard.tsx` | 2 | |
| `/src/components/offers/OffersList.jsx` | `/src/interface/web/components/offers/OffersList.tsx` | 3 | Użyć hooka z warstwą aplikacji |
| `/src/components/secure-access/*.jsx` | `/src/interface/web/components/secure-access/*.tsx` | 3 | Wydzielić logikę biznesową |

| **Warstwa Hooki** |
| `/src/hooks/api-hooks.js` | `/src/interface/web/hooks/api/*.ts` | 4 | Rozdzielić na mniejsze hooki per domena |
| `/src/hooks/form-hooks.js` | `/src/interface/web/hooks/form/*.ts` | 3 | |

| **Warstwa Stron** |
| `/src/app/page.jsx` i pozostałe strony | `/src/interface/web/pages/*.tsx` | 2 | Zachować zgodność z Next.js App Router |
| `/src/middleware.js` | `/src/interface/api/middlewares/AuthMiddleware.ts` | 3 | |