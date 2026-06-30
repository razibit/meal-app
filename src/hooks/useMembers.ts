import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { Member } from '../types';
import { queryKeys } from '../query/keys';

export function useMembers() {
  const query = useQuery({
    queryKey: queryKeys.members,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Member[];
    },
  });
  return { members: query.data || [], loading: query.isPending, error: query.error?.message || null, refetch: query.refetch };
}
