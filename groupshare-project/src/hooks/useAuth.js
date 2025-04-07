'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { createSupabaseClient } from '../lib/supabase-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [supabase, setSupabase] = useState(null);
  const [clerkToken, setClerkToken] = useState(null);

  // Get Clerk token when user is signed in
  useEffect(() => {
    async function getToken() {
      if (isSignedIn && user) {
        try {
          const token = await user.getToken({ template: "supabase" });
          setClerkToken(token);
        } catch (error) {
          console.error('Error getting Clerk token:', error);
        }
      } else {
        setClerkToken(null);
      }
    }
    
    getToken();
  }, [isSignedIn, user]);

  // Create Supabase client with Clerk token
  useEffect(() => {
    setSupabase(createSupabaseClient(clerkToken));
  }, [clerkToken]);

  // Fetch user profile
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