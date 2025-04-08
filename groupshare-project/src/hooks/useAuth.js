'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser, useAuth as useClerkAuth, useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext(null);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function AuthProvider({ children }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const { session } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [supabase, setSupabase] = useState(null);
  const [clerkToken, setClerkToken] = useState(null);

  // Tworzy klienta Supabase z wykorzystaniem nowej integracji Clerk
  useEffect(() => {
    if (!session) {
      setSupabase(createClient(supabaseUrl, supabaseAnonKey));
      setClerkToken(null);
      return;
    }
    
    // Tworzenie klienta z nową metodą integracji
    const client = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        async accessToken() {
          return session?.getToken() ?? null;
        },
      }
    );
    
    setSupabase(client);
    
    // Nadal pobiera token dla kompatybilności z innymi komponentami
    async function getToken() {
      try {
        const token = await session?.getToken();
        setClerkToken(token);
      } catch (error) {
        console.error('Error getting Clerk token:', error);
        setClerkToken(null);
      }
    }
    
    getToken();
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
        clerkToken,
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