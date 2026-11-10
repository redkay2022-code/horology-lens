import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Profile = { id: string; handle: string; display_name: string; bio: string; avatar_url: string | null };

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setReady(true); });
    void supabase.auth.getSession().then(({ data: d }) => { setSession(d.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, ready };
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, handle, display_name, bio, avatar_url').eq('id', userId!).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return async () => { await qc.cancelQueries(); qc.removeQueries({ queryKey: ['profile'] }); await supabase.auth.signOut(); };
}
