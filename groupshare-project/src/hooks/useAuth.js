'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser, useAuth as useClerkAuth, useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import supabase from '../lib/supabase-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const { session } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState(null);

  // Tworzy klienta Supabase z wykorzystaniem nowej integracji Clerk
  useEffect(() => {
    if (session) {
      // Używając nowej integracji z accessToken
      const client = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          async accessToken() {
            try {
              return session.getToken();
            } catch (error) {
              console.warn('Failed to get token from session:', error);
              return null;
            }
          }
        }
      );
      setSupabaseClient(client);
    } else {
      setSupabaseClient(supabase);
    }
  }, [session]);

  // Pobiera profil użytkownika
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setProfile(null);
      setIsLoadingProfile(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        console.log('Fetching profile for user:', user?.id);
        
        // Używamy API endpoint do pobrania profilu
        const response = await fetch('/api/auth/profile');
        
        if (response.ok) {
          const data = await response.json();
          console.log('Profile fetched successfully:', data);
          setProfile(data);
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch profile:', errorData);
          
          // Jeśli API zwróciło błąd, spróbujmy utworzyć profil
          if (response.status === 404) {
            console.log('Profile not found, attempting to create...');
            await createProfileViaAPI();
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    const createProfileViaAPI = async () => {
      if (!user) return;
      
      try {
        const newProfile = {
          display_name: user.fullName || 
            (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Nowy Użytkownik'),
          email: user.primaryEmailAddress?.emailAddress || '',
          avatar_url: user.imageUrl || null
        };
        
        // Próba utworzenia profilu przez API
        const response = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProfile)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Profile created successfully:', data);
          setProfile(data);
        } else {
          console.error('Failed to create profile via API');
        }
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    };

    fetchProfile();
  }, [isSignedIn, isLoaded, user]);

  return (
    <AuthContext.Provider 
      value={{ 
        clerkUser: user, 
        profile, 
        isLoaded, 
        isSignedIn,
        isLoadingProfile,
        isLoading: isLoadingProfile || !isLoaded,
        supabase: supabaseClient,
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