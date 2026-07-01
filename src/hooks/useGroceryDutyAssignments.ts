import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { GroceryDutyAssignment } from '../types';
import { queryKeys } from '../query/keys';

interface Period { startDate: string; endDate: string }

export function useGroceryDutyAssignments(period: Period, userId?: string) {
  const client = useQueryClient();
  const key = queryKeys.groceryDuties(period.startDate, period.endDate);
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('grocery_duty_assignments').select('*')
        .eq('billing_start_date', period.startDate).eq('billing_end_date', period.endDate)
        .order('duty_date').order('created_at');
      if (error) throw error;
      return (data || []) as GroceryDutyAssignment[];
    },
  });

  const add = useMutation({
    mutationFn: async ({ memberId, dutyDate }: { memberId: string; dutyDate: string }) => {
      if (!userId) throw new Error('An authenticated administrator is required.');
      const { data, error } = await supabase.from('grocery_duty_assignments').insert({
        billing_start_date: period.startDate, billing_end_date: period.endDate,
        duty_date: dutyDate, member_id: memberId, created_by: userId, updated_by: userId,
      }).select().single();
      if (error) throw error;
      return data as GroceryDutyAssignment;
    },
    onMutate: async ({ memberId, dutyDate }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<GroceryDutyAssignment[]>(key) || [];
      const optimistic: GroceryDutyAssignment = {
        id: `optimistic-${crypto.randomUUID()}`,
        billing_start_date: period.startDate,
        billing_end_date: period.endDate,
        duty_date: dutyDate,
        member_id: memberId,
        created_by: userId || '',
        updated_by: userId || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      client.setQueryData<GroceryDutyAssignment[]>(key, [...previous, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_error, _variables, context) => client.setQueryData(key, context?.previous),
    onSuccess: (created, _variables, context) => client.setQueryData<GroceryDutyAssignment[]>(key, (old = []) => old.map((item) => item.id === context?.optimisticId ? created : item)),
  });

  const move = useMutation({
    mutationFn: async ({ assignment, dutyDate }: { assignment: GroceryDutyAssignment; dutyDate: string }) => {
      if (!userId) throw new Error('An authenticated administrator is required.');
      const { data, error } = await supabase.from('grocery_duty_assignments')
        .update({ duty_date: dutyDate, updated_by: userId }).eq('id', assignment.id).select().single();
      if (error) throw error;
      return data as GroceryDutyAssignment;
    },
    onMutate: async ({ assignment, dutyDate }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<GroceryDutyAssignment[]>(key) || [];
      client.setQueryData<GroceryDutyAssignment[]>(key, previous.map((item) => item.id === assignment.id ? { ...item, duty_date: dutyDate } : item));
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(key, context?.previous),
    onSuccess: (updated) => client.setQueryData<GroceryDutyAssignment[]>(key, (old = []) => old.map((item) => item.id === updated.id ? updated : item)),
  });

  const remove = useMutation({
    mutationFn: async (assignment: GroceryDutyAssignment) => {
      const { error } = await supabase.from('grocery_duty_assignments').delete().eq('id', assignment.id);
      if (error) throw error;
      return assignment.id;
    },
    onMutate: async (assignment) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<GroceryDutyAssignment[]>(key) || [];
      client.setQueryData<GroceryDutyAssignment[]>(key, previous.filter((item) => item.id !== assignment.id));
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(key, context?.previous),
    onSuccess: (id) => client.setQueryData<GroceryDutyAssignment[]>(key, (old = []) => old.filter((item) => item.id !== id)),
  });

  return {
    assignments: query.data || [], loading: query.isPending,
    saving: add.isPending || move.isPending || remove.isPending,
    error: query.error || add.error || move.error || remove.error,
    add: add.mutateAsync, move: move.mutateAsync, remove: remove.mutateAsync,
  };
}
