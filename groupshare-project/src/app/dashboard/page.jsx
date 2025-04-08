'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Dashboard() {
  const { profile, isLoading, supabase, clerkUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState(null);

  // Pobierz dane po załadowaniu profilu i klienta Supabase
  useEffect(() => {
    if (isLoading || !profile || !supabase) return;

    const fetchDashboardData = async () => {
      setIsLoadingData(true);
      setError(null);

      try {
        // Pobierz aplikacje użytkownika
        const applicationsRes = await fetch('/api/applications?active=true');
        if (!applicationsRes.ok) throw new Error('Failed to fetch applications');
        const applicationsData = await applicationsRes.json();
        setApplications(applicationsData);

        // Pobierz oczekujące aplikacje (tylko dla właścicieli grup)
        const pendingRes = await fetch('/api/applications/pending');
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingApplications(pendingData);
        }

        // Pobierz grupy użytkownika - bezpośrednio z Supabase
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            description,
            owner_id,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });
        
        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Nie udało się pobrać wszystkich danych. Odśwież stronę, aby spróbować ponownie.');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [profile, isLoading, supabase]);

  // Wyświetl stan ładowania
  if (isLoading || isLoadingData) {
    return <LoadingSpinner />;
  }

  // Jeśli użytkownik nie jest zalogowany, przekierowanie obsłuży middleware
  if (!profile) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Witaj, {clerkUser?.fullName || profile?.display_name || 'użytkowniku'}! Oto aktualne informacje o Twoich subskrypcjach.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          {error}
        </div>
      )}

      {/* Sekcja akcji szybkich */}
      <div className="mb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/offers"
            className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <svg className="h-6 w-6 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Przeglądaj oferty</h3>
                <p className="text-sm text-gray-500">Znajdź nowe subskrypcje grupowe</p>
              </div>
            </div>
          </Link>
          
          <Link
            href="/groups/create"
            className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <svg className="h-6 w-6 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Utwórz grupę</h3>
                <p className="text-sm text-gray-500">Zacznij zarządzać własnymi subskrypcjami</p>
              </div>
            </div>
          </Link>
          
          <Link
            href="/applications"
            className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <svg className="h-6 w-6 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Twoje aplikacje</h3>
                <p className="text-sm text-gray-500">Zarządzaj zgłoszeniami o dostęp</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Aktywne aplikacje */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Twoje aktywne aplikacje</h2>
          {applications.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <p className="text-gray-500">Nie masz jeszcze żadnych aktywnych aplikacji.</p>
              <Link href="/offers" className="mt-3 inline-block text-indigo-600 hover:text-indigo-800">
                Przeglądaj dostępne oferty
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 3).map((app) => (
                <Link
                  href={`/applications/${app.id}`}
                  key={app.id}
                  className="block bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {app.group_sub?.subscription_platforms?.name || 'Platforma'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: <span className={`font-medium ${app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : app.status === 'rejected' ? 'text-red-600' : 'text-gray-600'}`}>
                          {app.status === 'pending' ? 'Oczekująca' : 
                           app.status === 'accepted' ? 'Zaakceptowana' : 
                           app.status === 'rejected' ? 'Odrzucona' : 
                           app.status === 'completed' ? 'Zakończona' : 
                           app.status === 'problem' ? 'Problem' : 
                           app.status === 'cancelled' ? 'Anulowana' : app.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-sm font-medium text-indigo-600">
                      {app.group_sub?.price_per_slot?.toFixed(2) || '-'} {app.group_sub?.currency || 'PLN'}/mies.
                    </div>
                  </div>
                </Link>
              ))}
              {applications.length > 3 && (
                <Link
                  href="/applications"
                  className="block text-center text-sm text-indigo-600 hover:text-indigo-800 mt-2"
                >
                  Zobacz wszystkie ({applications.length})
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Twoje grupy */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Twoje grupy</h2>
          {groups.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <p className="text-gray-500">Nie jesteś jeszcze członkiem żadnej grupy.</p>
              <Link href="/groups/create" className="mt-3 inline-block text-indigo-600 hover:text-indigo-800">
                Utwórz nową grupę
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.slice(0, 3).map((group) => (
                <Link
                  href={`/groups/${group.id}`}
                  key={group.id}
                  className="block bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Rola: <span className="font-medium">
                          {group.owner_id === profile.id ? 'Właściciel' : group.role === 'admin' ? 'Administrator' : 'Członek'}
                        </span>
                      </p>
                    </div>
                    <div className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full h-fit">
                      {group.subscription_count || 0} subskrypcji
                    </div>
                  </div>
                </Link>
              ))}
              {groups.length > 3 && (
                <Link
                  href="/groups"
                  className="block text-center text-sm text-indigo-600 hover:text-indigo-800 mt-2"
                >
                  Zobacz wszystkie ({groups.length})
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Oczekujące aplikacje (tylko dla właścicieli grup) */}
        {pendingApplications.length > 0 && (
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Oczekujące aplikacje do Twoich ofert</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {pendingApplications.slice(0, 5).map((app) => (
                  <li key={app.id} className="p-4 hover:bg-gray-50">
                    <Link href={`/applications/${app.id}`} className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                          {/* Zdjęcie profilowe */}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {app.applicant?.display_name || 'Użytkownik'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {app.group_sub?.subscription_platforms?.name || 'Platforma'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-600 text-sm font-medium">Oczekująca</span>
                        <svg className="ml-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {pendingApplications.length > 5 && (
                <div className="px-4 py-3 bg-gray-50 text-right">
                  <Link href="/applications/received" className="text-sm text-indigo-600 hover:text-indigo-800">
                    Zobacz wszystkie oczekujące aplikacje ({pendingApplications.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}