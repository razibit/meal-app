import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { invalidateDeposits, invalidateExpenses, invalidateMeals, invalidateMembers } from './invalidation';
import { queryKeys } from './keys';

export function RealtimeSync() {
  const client = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel('app-cache-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => void invalidateMembers(client))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, () => void invalidateMeals(client))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_details' }, () => void client.invalidateQueries({ queryKey: queryKeys.mealDetails() }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => void invalidateDeposits(client))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_expenses' }, () => void invalidateExpenses(client))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_rate_history' }, () => void client.invalidateQueries({ queryKey: queryKeys.mealRate() }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notes' }, () => void client.invalidateQueries({ queryKey: queryKeys.notes }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ocr_imports' }, () => void client.invalidateQueries({ queryKey: queryKeys.ocrHistory }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_duty_assignments' }, () => void client.invalidateQueries({ queryKey: queryKeys.groceryDuties() }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
  return null;
}
