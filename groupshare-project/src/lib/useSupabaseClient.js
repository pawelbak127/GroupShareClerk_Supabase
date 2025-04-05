import { useSession } from '@clerk/nextjs';
import { useMemo, useState, useEffect } from 'react';
import { getSupabaseClient } from './supabase-client';

export function useSupabaseClient() {
  const { session } = useSession();
  const [token, setToken] = useState(null);
  
  useEffect(() => {
    if (!session) return;
    
    async function getToken() {
      try {
        const supabaseToken = await session.getToken({ template: 'supabase' });
        setToken(supabaseToken);
      } catch (error) {
        console.error('Błąd podczas pobierania tokenu Supabase:', error);
      }
    }
    
    getToken();
  }, [session]);
  
  return useMemo(() => getSupabaseClient(token), [token]);
}