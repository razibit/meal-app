import { MEAL_PERIOD_LABELS, MEAL_PERIODS, type MealPeriod } from '../../constants/meals';

interface Props { activePeriod: MealPeriod; onPeriodChange: (period: MealPeriod) => void; selectedDate: string; }

function MealToggle({ activePeriod, onPeriodChange }: Props) {
  return <div className="mb-6"><div className="grid grid-cols-3 gap-2 bg-bg-tertiary p-1 rounded-full">
    {MEAL_PERIODS.map((period) => <button key={period} type="button" onClick={() => onPeriodChange(period)} className={`py-3 px-3 rounded-full font-medium transition-all min-h-touch ${activePeriod === period ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}>{MEAL_PERIOD_LABELS[period]}</button>)}
  </div></div>;
}
export default MealToggle;
