import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Member } from '../types';

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setMembers(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch members';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { members, loading, error, refetch: fetchMembers };
}
