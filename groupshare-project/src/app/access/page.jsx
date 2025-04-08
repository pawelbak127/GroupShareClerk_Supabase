'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ErrorBoundary } from 'react-error-boundary';
import SecureAccessDisplay from '@/components/secure-access/SecureAccessDisplay';
import LoginRedirect from '@/components/auth/LoginRedirect';

// Komponent wyświetlający informację o błędzie
function ErrorFallback({ error }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-red-50 rounded-lg border border-red-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-red-800">Wystąpił błąd</h2>
        <p className="mt-2 text-sm text-red-700">
          Nie udało się załadować strony. Spróbuj odświeżyć przeglądarkę lub skontaktuj się z obsługą.
        </p>
        <p className="mt-2 text-xs text-red-600">
          {error.message}
        </p>
      </div>
    </div>
  );
}

// Komponent z główną zawartością strony, który używa useSearchParams
function AccessPageContent() {
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Pobierz parametry z URL
  const applicationId = searchParams.get('id');
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (isLoaded) {
      setIsLoadingAuth(false);
    }
  }, [isLoaded]);
  
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">Weryfikacja...</span>
      </div>
    );
  }
  
  // Jeśli użytkownik nie jest zalogowany, przekieruj do logowania
  if (!isSignedIn) {
    return (
      <LoginRedirect
        message="Zaloguj się, aby uzyskać dostęp do instrukcji"
        returnTo={`/access?id=${applicationId}&token=${token}`}
      />
    );
  }
  
  // Jeśli brak wymaganych parametrów
  if (!applicationId || !token) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm p-6">
          <h2 className="text-lg font-medium text-yellow-800">Nieprawidłowy link dostępowy</h2>
          <p className="mt-2 text-sm text-yellow-700">
            Link dostępowy jest nieprawidłowy lub niekompletny. Poproś sprzedającego o wygenerowanie nowego linku.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instrukcje dostępowe</h1>
        <p className="text-gray-600 mt-1">
          Poniżej znajdują się jednorazowe instrukcje dostępowe do subskrypcji.
        </p>
      </div>
      
      <SecureAccessDisplay 
        applicationId={applicationId} 
        token={token} 
      />
    </div>
  );
}

// Główny komponent strony, który używa Suspense i ErrorBoundary
export default function AccessPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-600">Ładowanie...</span>
        </div>
      }>
        <AccessPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}