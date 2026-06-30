import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

const invalidate = (client: QueryClient, keys: readonly (readonly unknown[])[]) =>
  Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));

export const invalidateMembers = (client: QueryClient) => invalidate(client, [
  queryKeys.members, queryKeys.globalReport(), queryKeys.memberReport(), queryKeys.settlement(),
]);
export const invalidateMeals = (client: QueryClient) => invalidate(client, [
  queryKeys.meals(), queryKeys.memberReport(), queryKeys.globalReport(), queryKeys.mealRate(), queryKeys.settlement(),
]);
export const invalidateDeposits = (client: QueryClient) => invalidate(client, [
  queryKeys.deposits(), queryKeys.depositReport(), queryKeys.memberDeposit(), queryKeys.settlement(),
]);
export const invalidateExpenses = (client: QueryClient) => invalidate(client, [
  queryKeys.expenseReport(), queryKeys.mealRate(), queryKeys.settlement(),
]);
