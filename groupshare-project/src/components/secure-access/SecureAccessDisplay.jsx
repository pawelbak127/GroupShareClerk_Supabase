'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardIcon, CheckIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Komponent do bezpiecznego wyświetlania instrukcji dostępowych
 */
const SecureAccessDisplay = ({ applicationId, token }) => {
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minut w sekundach
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Pobierz instrukcje po załadowaniu komponentu
  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const response = await fetch(`/api/access/${applicationId}?token=${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Nie udało się pobrać instrukcji');
        }
        
        setInstructions(data.instructions);
      } catch (error) {
        console.error('Error fetching instructions:', error);
        setError(error.message || 'Wystąpił błąd podczas pobierania instrukcji');
        toast.error(error.message || 'Nie udało się pobrać instrukcji dostępowych');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (applicationId && token) {
      fetchInstructions();
    }
  }, [applicationId, token]);

  // Timer odliczający czas wygaśnięcia instrukcji
  useEffect(() => {
    if (!instructions || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [instructions, timeLeft]);

  // Formatuj czas pozostały
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Kopiuj instrukcje do schowka
  const copyToClipboard = () => {
    navigator.clipboard.writeText(instructions)
      .then(() => {
        setCopied(true);
        toast.success('Instrukcje skopiowane do schowka');
        
        // Reset copied status after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast.error('Nie udało się skopiować instrukcji');
      });
  };

  // Potwierdź działający dostęp
  const confirmAccess = async (isWorking) => {
    try {
      const response = await fetch(`/api/purchases/${applicationId}/confirm-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isWorking
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Nie udało się potwierdzić dostępu');
      }
      
      setConfirmed(true);
      
      if (isWorking) {
        toast.success('Dziękujemy za potwierdzenie działającego dostępu!');
      } else {
        toast.success('Zgłoszenie problemu zostało przyjęte. Sprzedający został powiadomiony.');
      }
    } catch (error) {
      console.error('Error confirming access:', error);
      toast.error(error.message || 'Wystąpił błąd podczas potwierdzania dostępu');
    }
  };

  // Renderowanie komponentu
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">Pobieranie instrukcji dostępowych...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 shadow-sm p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h3 className="ml-2 text-lg font-medium text-red-800">Wystąpił błąd</h3>
        </div>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <p className="mt-4 text-sm text-red-700">
          Link mógł wygasnąć lub został już wykorzystany. Poproś sprzedającego o wygenerowanie nowego linku.
        </p>
      </div>
    );
  }

  // Pozostałą część komponentu zostawiam bez zmian
  // ...
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Instrukcje dostępowe</h3>
        <div className="text-sm text-gray-500">
          Wygaśnie za: <span className={`font-medium ${timeLeft < 60 ? 'text-red-500' : ''}`}>{formatTimeLeft()}</span>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
        <div className="flex">
          <ShieldCheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Zabezpieczone połączenie</h4>
            <p className="text-xs text-blue-700 mt-1">
              Te instrukcje zostały odszyfrowane jednorazowo i są widoczne tylko dla Ciebie. Ze względów bezpieczeństwa zostaną automatycznie usunięte po wygaśnięciu czasu.
            </p>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <pre className="bg-gray-50 rounded-md border border-gray-200 p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {instructions}
        </pre>
        
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-white text-gray-500 border border-gray-300 hover:bg-gray-50"
          title="Kopiuj do schowka"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-green-600" />
          ) : (
            <ClipboardIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {!confirmed && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Czy instrukcje działają?</h4>
          <div className="flex space-x-3">
            <button
              onClick={() => confirmAccess(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Tak, dostęp działa
            </button>
            
            <button
              onClick={() => confirmAccess(false)}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Nie, mam problem
            </button>
          </div>
        </div>
      )}
      
      {confirmed && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="ml-2 text-sm text-gray-600">
              Dziękujemy za potwierdzenie. Zapisz te instrukcje w bezpiecznym miejscu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureAccessDisplay;