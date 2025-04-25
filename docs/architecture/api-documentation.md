# Dokumentacja API GroupShare

## Wprowadzenie

API GroupShare umożliwia deweloperom integrację swoich aplikacji z naszą platformą. API udostępnia szereg endpointów pozwalających na zarządzanie kontami użytkowników, grupami, subskrypcjami i płatnościami.

Ta dokumentacja opisuje wszystkie dostępne endpointy, wymagane parametry, format odpowiedzi oraz przykłady użycia dla wersji MVP platformy GroupShare.

## Podstawowe informacje

### Wersja API

Aktualna wersja API: `v1`

Wszystkie endpointy są dostępne pod adresem bazowym:
```
https://api.groupshare.app/v1
```

### Autentykacja

API GroupShare używa tokenu JWT (JSON Web Token) do uwierzytelniania zapytań. Token można uzyskać przez endpoint `/auth/token`.

Token należy dołączyć do każdego zapytania w nagłówku HTTP `Authorization`:

```
Authorization: Bearer [token]
```

### Format danych

API GroupShare przyjmuje i zwraca dane w formacie JSON. W przypadku zapytań zawierających dane (POST, PUT), ustaw nagłówek `Content-Type` na `application/json`.

### Kody odpowiedzi

API używa standardowych kodów HTTP:

- `200 OK` - Zapytanie zakończyło się sukcesem
- `201 Created` - Zasób został pomyślnie utworzony
- `400 Bad Request` - Zapytanie zawiera błędy (nieprawidłowe parametry)
- `401 Unauthorized` - Brak uwierzytelnienia lub nieprawidłowy token
- `403 Forbidden` - Brak uprawnień do wykonania żądanej operacji
- `404 Not Found` - Żądany zasób nie istnieje
- `409 Conflict` - Konflikt zasobów (np. duplikat)
- `422 Unprocessable Entity` - Nieprawidłowe dane wejściowe
- `429 Too Many Requests` - Przekroczono limit zapytań
- `500 Internal Server Error` - Błąd serwera

### Limity zapytań

Domyślny limit zapytań wynosi 100 zapytań na minutę na token. Po przekroczeniu limitu, serwer zwróci status `429 Too Many Requests`.

### Wersjonowanie

API jest wersjonowane w URL (np. `/v1/users`). Wprowadzanie zmian łamiących wsteczną kompatybilność będzie skutkować utworzeniem nowej wersji API.

## Endpointy

### Autentykacja

#### Logowanie i uzyskanie tokenu

```
POST /auth/token
```

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| email | string | tak | Adres email użytkownika |
| password | string | tak | Hasło użytkownika |

**Przykład zapytania**

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Przykład odpowiedzi**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-04-02T12:00:00Z",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

#### Odświeżenie tokenu

```
POST /auth/refresh
```

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| refresh_token | string | tak | Token odświeżający |

**Przykład zapytania**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Przykład odpowiedzi**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-04-02T12:00:00Z",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Wylogowanie

```
POST /auth/logout
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Przykład odpowiedzi**

```json
{
  "message": "Successfully logged out"
}
```

### Użytkownicy

#### Pobranie danych użytkownika

```
GET /users/me
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Przykład odpowiedzi**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "user@example.com",
  "display_name": "John Doe",
  "profile": {
    "avatar_url": "https://groupshare.app/avatars/default.png",
    "bio": "Enthusiast of shared subscriptions",
    "rating_avg": 4.8,
    "rating_count": 15,
    "is_premium": false,
    "verification_level": "basic"
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-03-20T14:15:00Z"
}
```

#### Aktualizacja danych użytkownika

```
PATCH /users/me
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| display_name | string | nie | Wyświetlana nazwa użytkownika |
| profile.avatar_url | string | nie | URL do zdjęcia profilowego |
| profile.bio | string | nie | Krótki opis użytkownika |

**Przykład zapytania**

```json
{
  "display_name": "John Smith",
  "profile": {
    "bio": "I love sharing subscriptions with friends!"
  }
}
```

**Przykład odpowiedzi**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "user@example.com",
  "display_name": "John Smith",
  "profile": {
    "avatar_url": "https://groupshare.app/avatars/default.png",
    "bio": "I love sharing subscriptions with friends!",
    "rating_avg": 4.8,
    "rating_count": 15,
    "is_premium": false,
    "verification_level": "basic"
  },
  "updated_at": "2025-04-01T09:45:00Z"
}
```

#### Pobranie danych innego użytkownika

```
GET /users/{user_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| user_id | string | tak | Identyfikator użytkownika |

**Przykład odpowiedzi**

```json
{
  "id": "e37a8c9d-47e6-4b5f-9a8c-9d47e64b5f9a",
  "display_name": "Jane Doe",
  "profile": {
    "avatar_url": "https://groupshare.app/avatars/jane.png",
    "bio": "Netflix and Spotify fan",
    "rating_avg": 4.9,
    "rating_count": 27,
    "verification_level": "verified"
  }
}
```

### Grupy

#### Pobieranie grup użytkownika

```
GET /groups
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| page | integer | nie | Numer strony (domyślnie: 1) |
| per_page | integer | nie | Liczba elementów na stronę (domyślnie: 20, max: 100) |

**Przykład odpowiedzi**

```json
{
  "groups": [
    {
      "id": "a31b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p",
      "name": "Rodzina",
      "description": "Grupa rodzinna dla wspólnych subskrypcji",
      "owner_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "member_count": 4,
      "subscription_count": 3,
      "created_at": "2025-02-10T18:30:00Z"
    },
    {
      "id": "b42c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q",
      "name": "Współlokatorzy",
      "description": "Subskrypcje ze współlokatorami",
      "owner_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "member_count": 3,
      "subscription_count": 2,
      "created_at": "2025-03-05T09:15:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "per_page": 20,
    "current_page": 1,
    "total_pages": 1
  }
}
```

#### Tworzenie nowej grupy

```
POST /groups
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| name | string | tak | Nazwa grupy |
| description | string | nie | Opis grupy |
| is_public | boolean | nie | Czy grupa jest publiczna (domyślnie: false) |

**Przykład zapytania**

```json
{
  "name": "Znajomi ze studiów",
  "description": "Grupa dla wspólnych subskrypcji ze znajomymi z uczelni",
  "is_public": false
}
```

**Przykład odpowiedzi**

```json
{
  "id": "c53d4e5f-6g7h-8i9j-0k1l-2m3n4o5p6q7r",
  "name": "Znajomi ze studiów",
  "description": "Grupa dla wspólnych subskrypcji ze znajomymi z uczelni",
  "owner_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "is_public": false,
  "member_count": 1,
  "subscription_count": 0,
  "created_at": "2025-04-01T10:00:00Z"
}
```

#### Pobieranie szczegółów grupy

```
GET /groups/{group_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| group_id | string | tak | Identyfikator grupy |

**Przykład odpowiedzi**

```json
{
  "id": "c53d4e5f-6g7h-8i9j-0k1l-2m3n4o5p6q7r",
  "name": "Znajomi ze studiów",
  "description": "Grupa dla wspólnych subskrypcji ze znajomymi z uczelni",
  "owner_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "is_public": false,
  "members": [
    {
      "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "display_name": "John Smith",
      "role": "admin",
      "joined_at": "2025-04-01T10:00:00Z"
    }
  ],
  "subscriptions": [],
  "created_at": "2025-04-01T10:00:00Z",
  "updated_at": "2025-04-01T10:00:00Z"
}
```

#### Aktualizacja grupy

```
PATCH /groups/{group_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| group_id | string | tak | Identyfikator grupy |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| name | string | nie | Nowa nazwa grupy |
| description | string | nie | Nowy opis grupy |
| is_public | boolean | nie | Czy grupa jest publiczna |

**Przykład zapytania**

```json
{
  "description": "Grupa dla wspólnych subskrypcji ze znajomymi z Informatyki"
}
```

**Przykład odpowiedzi**

```json
{
  "id": "c53d4e5f-6g7h-8i9j-0k1l-2m3n4o5p6q7r",
  "name": "Znajomi ze studiów",
  "description": "Grupa dla wspólnych subskrypcji ze znajomymi z Informatyki",
  "owner_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "is_public": false,
  "updated_at": "2025-04-01T10:30:00Z"
}
```

#### Zapraszanie użytkownika do grupy

```
POST /groups/{group_id}/invitations
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| group_id | string | tak | Identyfikator grupy |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| email | string | tak* | Email zapraszanego użytkownika (*wymagane jeśli nie podano user_id) |
| user_id | string | tak* | ID zapraszanego użytkownika (*wymagane jeśli nie podano email) |
| role | string | nie | Rola w grupie (admin/member, domyślnie: member) |

**Przykład zapytania**

```json
{
  "email": "friend@example.com",
  "role": "member"
}
```

**Przykład odpowiedzi**

```json
{
  "id": "d64e5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
  "group_id": "c53d4e5f-6g7h-8i9j-0k1l-2m3n4o5p6q7r",
  "email": "friend@example.com",
  "role": "member",
  "status": "pending",
  "invitation_url": "https://groupshare.app/invite/a1b2c3d4",
  "expires_at": "2025-04-08T10:30:00Z",
  "created_at": "2025-04-01T10:30:00Z"
}
```

### Subskrypcje

#### Pobieranie ofert subskrypcji

```
GET /subscriptions
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| platform_id | string | nie | Filtrowanie po platformie |
| price_min | number | nie | Minimalna cena |
| price_max | number | nie | Maksymalna cena |
| instant_access | boolean | nie | Tylko z natychmiastowym dostępem |
| page | integer | nie | Numer strony (domyślnie: 1) |
| per_page | integer | nie | Liczba elementów na stronę (domyślnie: 20, max: 100) |

**Przykład odpowiedzi**

```json
{
  "subscriptions": [
    {
      "id": "e75f6g7h-8i9j-0k1l-2m3n-4o5p6q7r8s9t",
      "group_id": "a31b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p",
      "platform": {
        "id": "netflix",
        "name": "Netflix",
        "icon": "https://groupshare.app/platforms/netflix.png",
        "requirements_text": "Wymagający wspólny adres",
        "requirements_icon": "🏠"
      },
      "owner": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "display_name": "John Smith",
        "rating_avg": 4.8
      },
      "slots_total": 4,
      "slots_available": 2,
      "price_per_slot": 29.99,
      "currency": "PLN",
      "instant_access": true,
      "created_at": "2025-03-15T14:30:00Z"
    },
    {
      "id": "f86g7h8i-9j0k-1l2m-3n4o-5p6q7r8s9t0u",
      "group_id": "b42c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q",
      "platform": {
        "id": "spotify",
        "name": "Spotify",
        "icon": "https://groupshare.app/platforms/spotify.png",
        "requirements_text": "Wymagający wspólny adres",
        "requirements_icon": "🏠"
      },
      "owner": {
        "id": "e37a8c9d-47e6-4b5f-9a8c-9d47e64b5f9a",
        "display_name": "Jane Doe",
        "rating_avg": 4.9
      },
      "slots_total": 6,
      "slots_available": 1,
      "price_per_slot": 19.99,
      "currency": "PLN",
      "instant_access": false,
      "created_at": "2025-03-20T09:45:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "per_page": 20,
    "current_page": 1,
    "total_pages": 1
  }
}
```

#### Tworzenie oferty subskrypcji

```
POST /groups/{group_id}/subscriptions
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| group_id | string | tak | Identyfikator grupy |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| platform_id | string | tak | ID platformy subskrypcyjnej |
| slots_total | integer | tak | Całkowita liczba miejsc |
| slots_available | integer | tak | Dostępne miejsca |
| price_per_slot | number | tak | Cena za miejsce |
| currency | string | tak | Waluta (np. PLN) |
| instant_access | boolean | tak | Czy oferuje natychmiastowy dostęp |
| access_instructions | string | warunkowy | Instrukcje dostępu (wymagane, jeśli instant_access=true) |
| description | string | nie | Dodatkowy opis oferty |

**Przykład zapytania**

```json
{
  "platform_id": "netflix",
  "slots_total": 4,
  "slots_available": 2,
  "price_per_slot": 29.99,
  "currency": "PLN",
  "instant_access": true,
  "access_instructions": "Login: user@example.com\nHasło: SecurePassword123\nProfil: Użytkownik 3",
  "description": "Plan Premium, 4K, wszystkie urządzenia"
}
```

**Przykład odpowiedzi**

```json
{
  "id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
  "group_id": "c53d4e5f-6g7h-8i9j-0k1l-2m3n4o5p6q7r",
  "platform": {
    "id": "netflix",
    "name": "Netflix",
    "icon": "https://groupshare.app/platforms/netflix.png",
    "requirements_text": "Wymagający wspólny adres",
    "requirements_icon": "🏠"
  },
  "slots_total": 4,
  "slots_available": 2,
  "price_per_slot": 29.99,
  "currency": "PLN",
  "instant_access": true,
  "description": "Plan Premium, 4K, wszystkie urządzenia",
  "created_at": "2025-04-01T11:00:00Z"
}
```

#### Pobieranie szczegółów subskrypcji

```
GET /subscriptions/{subscription_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| subscription_id | string | tak | Identyfikator subskrypcji |

**Przykład odpowiedzi**

```json
{
  "id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
  "group_id": "c53d4e5f-6g7h-8i9j-0k1l-2m3n4o5p6q7r",
  "platform": {
    "id": "netflix",
    "name": "Netflix",
    "icon": "https://groupshare.app/platforms/netflix.png",
    "requirements_text": "Wymagający wspólny adres",
    "requirements_icon": "🏠"
  },
  "owner": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "display_name": "John Smith",
    "rating_avg": 4.8
  },
  "slots_total": 4,
  "slots_available": 2,
  "price_per_slot": 29.99,
  "currency": "PLN",
  "instant_access": true,
  "description": "Plan Premium, 4K, wszystkie urządzenia",
  "members": [
    {
      "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "display_name": "John Smith",
      "role": "owner"
    },
    {
      "user_id": "e37a8c9d-47e6-4b5f-9a8c-9d47e64b5f9a",
      "display_name": "Jane Doe",
      "role": "member"
    }
  ],
  "created_at": "2025-04-01T11:00:00Z",
  "updated_at": "2025-04-01T11:00:00Z"
}
```

#### Aktualizacja subskrypcji

```
PATCH /subscriptions/{subscription_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| subscription_id | string | tak | Identyfikator subskrypcji |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| slots_available | integer | nie | Dostępne miejsca |
| price_per_slot | number | nie | Cena za miejsce |
| access_instructions | string | nie | Nowe instrukcje dostępu |
| description | string | nie | Nowy opis oferty |

**Przykład zapytania**

```json
{
  "price_per_slot": 27.99,
  "description": "Plan Premium, 4K, wszystkie urządzenia, nowa niższa cena"
}
```

**Przykład odpowiedzi**

```json
{
  "id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
  "price_per_slot": 27.99,
  "description": "Plan Premium, 4K, wszystkie urządzenia, nowa niższa cena",
  "updated_at": "2025-04-01T11:30:00Z"
}
```

### Aplikacje i dostęp

#### Aplikowanie o miejsce w subskrypcji

```
POST /subscriptions/{subscription_id}/applications
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| subscription_id | string | tak | Identyfikator subskrypcji |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| message | string | nie | Wiadomość dla właściciela subskrypcji |

**Przykład zapytania**

```json
{
  "message": "Chciałbym dołączyć do Waszej subskrypcji. Poszukuję dostępu do Netflixa na dłuższy czas."
}
```

**Przykład odpowiedzi**

```json
{
  "id": "h08i9j0k-1l2m-3n4o-5p6q-7r8s9t0u1v2w",
  "subscription_id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
  "user_id": "e37a8c9d-47e6-4b5f-9a8c-9d47e64b5f9a",
  "message": "Chciałbym dołączyć do Waszej subskrypcji. Poszukuję dostępu do Netflixa na dłuższy czas.",
  "status": "pending",
  "created_at": "2025-04-01T12:00:00Z"
}
```

#### Pobieranie aplikacji do subskrypcji

```
GET /subscriptions/{subscription_id}/applications
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| subscription_id | string | tak | Identyfikator subskrypcji |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| status | string | nie | Filtrowanie po statusie (pending/accepted/rejected) |
| page | integer | nie | Numer strony (domyślnie: 1) |
| per_page | integer | nie | Liczba elementów na stronę (domyślnie: 20, max: 100) |

**Przykład odpowiedzi**

```json
{
  "applications": [
    {
      "id": "h08i9j0k-1l2m-3n4o-5p6q-7r8s9t0u1v2w",
      "subscription_id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
      "user": {
        "id": "e37a8c9d-47e6-4b5f-9a8c-9d47e64b5f9a",
        "display_name": "Jane Doe",
        "rating_avg": 4.9
      },
      "message": "Chciałbym dołączyć do Waszej subskrypcji. Poszukuję dostępu do Netflixa na dłuższy czas.",
      "status": "pending",
      "created_at": "2025-04-01T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "per_page": 20,
    "current_page": 1,
    "total_pages": 1
  }
}
```

#### Akceptacja aplikacji

```
PATCH /applications/{application_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| application_id | string | tak | Identyfikator aplikacji |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| status | string | tak | Nowy status (accepted/rejected) |
| message | string | nie | Wiadomość dla aplikującego |

**Przykład zapytania**

```json
{
  "status": "accepted",
  "message": "Witaj w naszej grupie! Po dokonaniu płatności otrzymasz dostęp."
}
```

**Przykład odpowiedzi**

```json
{
  "id": "h08i9j0k-1l2m-3n4o-5p6q-7r8s9t0u1v2w",
  "status": "accepted",
  "message": "Witaj w naszej grupie! Po dokonaniu płatności otrzymasz dostęp.",
  "updated_at": "2025-04-01T12:30:00Z",
  "payment_url": "https://groupshare.app/payments/h08i9j0k"
}
```

### Płatności

#### Inicjowanie płatności

```
POST /applications/{application_id}/payments
```

**Nagłówki**

- `Authorization: Bearer [token]`
- `Content-Type: application/json`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| application_id | string | tak | Identyfikator aplikacji |

**Parametry zapytania**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| payment_method | string | tak | Metoda płatności (blik/card/transfer) |
| return_url | string | tak | URL powrotu po płatności |

**Przykład zapytania**

```json
{
  "payment_method": "blik",
  "return_url": "https://groupshare.app/subscriptions/g97h8i9j"
}
```

**Przykład odpowiedzi**

```json
{
  "id": "i19j0k1l-2m3n-4o5p-6q7r-8s9t0u1v2w3x",
  "amount": 27.99,
  "currency": "PLN",
  "status": "pending",
  "payment_url": "https://payment.payu.com/123456789",
  "created_at": "2025-04-01T13:00:00Z"
}
```

#### Pobieranie statusu płatności

```
GET /payments/{payment_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| payment_id | string | tak | Identyfikator płatności |

**Przykład odpowiedzi**

```json
{
  "id": "i19j0k1l-2m3n-4o5p-6q7r-8s9t0u1v2w3x",
  "application_id": "h08i9j0k-1l2m-3n4o-5p6q-7r8s9t0u1v2w",
  "subscription_id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
  "amount": 27.99,
  "platform_fee": 1.96,
  "seller_amount": 26.03,
  "currency": "PLN",
  "payment_method": "blik",
  "payment_provider": "payu",
  "status": "completed",
  "access_token": {
    "token": "j20k1l2m-3n4o-5p6q-7r8s-9t0u1v2w3x4y",
    "expires_at": "2025-04-01T13:30:00Z"
  },
  "created_at": "2025-04-01T13:00:00Z",
  "updated_at": "2025-04-01T13:05:00Z"
}
```

#### Pobieranie instrukcji dostępu

```
GET /access/{token}
```

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| token | string | tak | Token dostępu |

**Przykład odpowiedzi**

```json
{
  "subscription": {
    "id": "g97h8i9j-0k1l-2m3n-4o5p-6q7r8s9t0u1v",
    "platform": {
      "id": "netflix",
      "name": "Netflix",
      "icon": "https://groupshare.app/platforms/netflix.png"
    }
  },
  "instructions": "Login: user@example.com\nHasło: SecurePassword123\nProfil: Użytkownik 3",
  "expires_at": "2025-04-01T13:30:00Z"
}
```

### Platformy

#### Pobieranie listy platform

```
GET /platforms
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Przykład odpowiedzi**

```json
{
  "platforms": [
    {
      "id": "netflix",
      "name": "Netflix",
      "icon": "https://groupshare.app/platforms/netflix.png",
      "description": "Streaming filmów i seriali",
      "max_members": 5,
      "requirements_text": "Wymagający wspólny adres",
      "requirements_icon": "🏠"
    },
    {
      "id": "spotify",
      "name": "Spotify",
      "icon": "https://groupshare.app/platforms/spotify.png",
      "description": "Streaming muzyki",
      "max_members": 6,
      "requirements_text": "Wymagający wspólny adres",
      "requirements_icon": "🏠"
    },
    {
      "id": "microsoft-365",
      "name": "Microsoft 365",
      "icon": "https://groupshare.app/platforms/microsoft-365.png",
      "description": "Pakiet biurowy i aplikacje Office",
      "max_members": 6,
      "requirements_text": "Bardzo elastyczne zasady",
      "requirements_icon": "✨"
    }
  ]
}
```

#### Pobieranie szczegółów platformy

```
GET /platforms/{platform_id}
```

**Nagłówki**

- `Authorization: Bearer [token]`

**Parametry ścieżki**

| Nazwa | Typ | Wymagany | Opis |
|-------|-----|----------|------|
| platform_id | string | tak | Identyfikator platformy |

**Przykład odpowiedzi**

```json
{
  "id": "netflix",
  "name": "Netflix",
  "icon": "https://groupshare.app/platforms/netflix.png",
  "description": "Streaming filmów i seriali",
  "max_members": 5,
  "requirements_text": "Wymagający wspólny adres",
  "requirements_icon": "🏠",
  "features": [
    "HD i Ultra HD",
    "Pobieranie na urządzenia mobilne",
    "Kilka profili"
  ],
  "plans": [
    {
      "name": "Podstawowy",
      "price": 29.00,
      "max_members": 1
    },
    {
      "name": "Standard",
      "price": 43.00,
      "max_members": 2
    },
    {
      "name": "Premium",
      "price": 60.00,
      "max_members": 4
    }
  ],
  "restrictions": [
    "Wymagany wspólny adres dla wszystkich uczestników",
    "Możliwość blokady za współdzielenie poza gospodarstwem domowym",
    "Weryfikacja lokalizacji"
  ]
}
```

## Kody błędów i rozwiązywanie problemów

### Standardowe kody błędów

Poniżej znajdują się typowe kody błędów, które mogą wystąpić podczas korzystania z API:

| Kod HTTP | Opis | Rozwiązanie |
|----------|------|-------------|
| 400 | Bad Request | Sprawdź poprawność przesyłanych danych |
| 401 | Unauthorized | Odśwież token lub zaloguj się ponownie |
| 403 | Forbidden | Brak uprawnień do wykonania operacji |
| 404 | Not Found | Zasób nie istnieje |
| 409 | Conflict | Wystąpił konflikt (np. duplikat) |
| 422 | Unprocessable Entity | Nieprawidłowe dane wejściowe |
| 429 | Too Many Requests | Przekroczono limit zapytań, zaczekaj |
| 500 | Internal Server Error | Błąd serwera, spróbuj ponownie później |

### Format błędów

Odpowiedzi zawierające błędy zwracane są w następującym formacie:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Nieprawidłowy format danych",
    "details": {
      "fields": {
        "email": "Nieprawidłowy format adresu email"
      }
    }
  }
}
```

### Typowe problemy i rozwiązania

#### Problem z autentykacją

Jeśli otrzymujesz kod błędu 401:
- Sprawdź, czy token jest ważny
- Użyj endpointu `/auth/refresh`, aby odświeżyć token
- Zaloguj się ponownie, aby uzyskać nowy token

#### Limit zapytań

Jeśli otrzymujesz kod błędu 429:
- Zaczekaj przed ponownym wysłaniem zapytania
- Zoptymalizuj liczbę zapytań
- Rozważ użycie cache dla częstych zapytań

#### Problemy z płatnościami

Jeśli płatność nie została zrealizowana:
- Sprawdź status płatności przez endpoint `/payments/{payment_id}`
- Upewnij się, że dane płatności są poprawne
- Sprawdź, czy metoda płatności jest aktywna

## Dobre praktyki

### Optymalizacja zapytań

- Używaj parametrów paginacji `page` i `per_page` dla endpointów zwracających listy
- Używaj filtrów, aby ograniczyć ilość zwracanych danych
- Stosuj cache dla często używanych danych
- Unikaj nadmiernej liczby zapytań w krótkim czasie

### Bezpieczeństwo

- Nie przechowuj tokenów JWT w niezabezpieczonych miejscach
- Stosuj HTTPS dla wszystkich zapytań
- Regularnie odświeżaj tokeny
- Obsługuj błędy autentykacji i autoryzacji

### Obsługa błędów

- Zawsze sprawdzaj kody odpowiedzi HTTP
- Implementuj mechanizmy ponawiania dla tymczasowych błędów
- Loguj szczegóły błędów do celów diagnostycznych
- Wyświetlaj przyjazne dla użytkownika komunikaty błędów

## Ograniczenia API

- Limit zapytań: 100 zapytań na minutę na token
- Maksymalny rozmiar ciała zapytania: 1MB
- Maksymalna liczba elementów na stronę: 100
- Tokeny JWT wygasają po 60 minutach
- Tokeny odświeżające wygasają po 30 dniach
- Tokeny dostępu do instrukcji wygasają po 30 minutach

## Zmiany w API

### Wersjonowanie

API GroupShare jest wersjonowane w URL (np. `/v1/users`). Wprowadzenie zmian łamiących będzie skutkować utworzeniem nowej wersji API (np. `/v2/users`).

Stare wersje API będą wspierane przez co najmniej 6 miesięcy od momentu wydania nowej wersji.

### Powiadomienia o zmianach

Informacje o zmianach w API będą publikowane na:
- Stronie statusu API: [status.groupshare.app](https://status.groupshare.app)
- Blogu dla deweloperów: [developers.groupshare.app/blog](https://developers.groupshare.app/blog)
- Liście mailingowej (konieczna subskrypcja)

## Wsparcie

### Dokumentacja

Pełna dokumentacja API jest dostępna pod adresem:
[developers.groupshare.app/docs](https://developers.groupshare.app/docs)

### Kontakt z zespołem

W przypadku pytań lub problemów:
- Email: api@groupshare.app
- Formularz kontaktowy: [developers.groupshare.app/contact](https://developers.groupshare.app/contact)

---

*Ostatnia aktualizacja: 1 kwietnia 2025*