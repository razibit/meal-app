import { MEAL_PERIOD_LABELS, MEAL_PERIODS, type MealPeriod } from '../../constants/meals';
import type { Meal, Member } from '../../types';

interface AdminMealGridProps {
  members: Member[];
  meals: Meal[];
  selectedDate: string;
  loading: boolean;
  onQuantityChange: (memberId: string, period: MealPeriod, quantity: number) => Promise<void>;
}

function AdminMealGrid({ members, meals, selectedDate, loading, onQuantityChange }: AdminMealGridProps) {
  const activeMembers = members.filter((member) => member.active !== false);

  const getQuantity = (memberId: string, period: MealPeriod) => {
    return meals.find(
      (meal) => meal.member_id === memberId && meal.meal_date === selectedDate && meal.period === period
    )?.quantity || 0;
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 bg-bg-secondary border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Daily Meal Log</h3>
        <p className="text-sm text-text-secondary">Toggle whiteboard-confirmed meals for {selectedDate}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg-tertiary border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Member</th>
              {MEAL_PERIODS.map((period) => (
                <th key={period} className="px-3 py-3 text-center text-sm font-semibold text-text-primary">
                  {MEAL_PERIOD_LABELS[period]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeMembers.map((member) => (
              <tr key={member.id} className="border-b border-border hover:bg-bg-secondary transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">{member.name}</div>
                  <div className="text-xs text-text-secondary capitalize">{member.rice_preference} rice</div>
                </td>
                {MEAL_PERIODS.map((period) => {
                  const quantity = getQuantity(member.id, period);
                  return (
                    <td key={period} className="px-3 py-3 text-center">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onQuantityChange(member.id, period, quantity > 0 ? 0 : 1)}
                        className={`
                          w-11 h-11 rounded-lg border font-bold transition-all
                          ${quantity > 0
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-bg-primary text-text-tertiary border-border hover:border-primary hover:text-primary'
                          }
                        `}
                        aria-label={`${quantity > 0 ? 'Remove' : 'Add'} ${MEAL_PERIOD_LABELS[period]} for ${member.name}`}
                      >
                        {quantity > 0 ? quantity : '-'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminMealGrid;
