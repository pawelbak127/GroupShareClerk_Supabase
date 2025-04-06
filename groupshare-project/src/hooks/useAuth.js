'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
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
  }, [isSignedIn, isLoaded, user?.id]);

  return (
    <AuthContext.Provider 
      value={{ 
        clerkUser: user, 
        profile, 
        isLoaded, 
        isSignedIn, 
        isLoadingProfile,
        isLoading: isLoadingProfile || !isLoaded,
        supabase
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