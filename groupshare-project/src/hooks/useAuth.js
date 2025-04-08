'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser, useAuth as useClerkAuth, useSession } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '../lib/clerk-supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const { session } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [supabase, setSupabase] = useState(null);

  // Tworzy klienta Supabase z wykorzystaniem nowej integracji Clerk
  useEffect(() => {
    setSupabase(createClerkSupabaseClient(session));
  }, [session]);

  // Pobiera profil użytkownika
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !supabase) {
      setProfile(null);
      setIsLoadingProfile(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await fetch('/api/auth/profile');
        
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          console.error('Failed to fetch profile');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [isSignedIn, isLoaded, user?.id, supabase]);

  return (
    <AuthContext.Provider 
      value={{ 
        clerkUser: user, 
        profile, 
        isLoaded, 
        isSignedIn,
        isLoadingProfile,
        isLoading: isLoadingProfile || !isLoaded,
        supabase,
        session
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}