import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMealStore } from '../stores/mealStore';
import { getTodayDate } from '../utils/dateHelpers';
import { MEAL_PERIODS, MEAL_PERIOD_LABELS, type MealPeriod } from '../constants/meals';
import DateSelector from '../components/home/DateSelector';
import MealToggle from '../components/home/MealToggle';
import MealCounts from '../components/home/MealCounts';
import MealDetailsEditor from '../components/home/MealDetailsEditor';
import GroceryExpenseCard from '../components/home/GroceryExpenseCard';
import ParticipantsModal from '../components/home/ParticipantsModal';
import AdminMealGrid from '../components/home/AdminMealGrid';
import MemberManagement from '../components/home/MemberManagement';
import OcrMealImport from '../components/home/OcrMealImport';
import { DepositSection } from '../components/preferences/DepositSection';
import AdminNotes from '../components/home/AdminNotes';
import OcrHistory from '../components/home/OcrHistory';

function Home() {
  const { user } = useAuthStore();
  const {
    meals,
    mealDetails,
    members,
    loading,
    error,
    fetchMeals,
    fetchMealDetails,
    fetchMembers,
    updateMealQuantity,
    updateMealDetails,
    getMealCounts,
    clearError,
  } = useMealStore();

  const [activePeriod, setActivePeriod] = useState<MealPeriod>('breakfast');
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchMeals(selectedDate);
    fetchMealDetails(selectedDate);
  }, [selectedDate, fetchMeals, fetchMealDetails]);

  const handleSaveMealDetails = useCallback(async (details: string) => {
    if (!user) return;
    await updateMealDetails(selectedDate, `${activePeriod}_details`, details, user.id);
  }, [user, selectedDate, activePeriod, updateMealDetails]);

  const handleQuantityChange = useCallback(async (memberId: string, period: MealPeriod, quantity: number) => {
    await updateMealQuantity(memberId, selectedDate, period, quantity);
  }, [selectedDate, updateMealQuantity]);

  const activeCount = getMealCounts(activePeriod, selectedDate);
  const totalCounts = useMemo(() => {
    return MEAL_PERIODS.map((period) => ({
      period,
      count: getMealCounts(period, selectedDate),
    }));
  }, [getMealCounts, selectedDate]);

  const currentDetails = useMemo(() => {
    return mealDetails?.[`${activePeriod}_details`] || '';
  }, [activePeriod, mealDetails]);

  return (
    <div className="p-4 max-w-6xl mx-auto animate-fade-in">
      {error && (
        <div className="mb-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg flex items-center justify-between animate-slide-down">
          <span>{error}</span>
          <button onClick={clearError} className="text-error hover:text-text-primary" aria-label="Dismiss error">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Admin Meal Dashboard</h1>
        <p className="text-sm text-text-secondary">Manage members, log meals, and import kitchen whiteboard photos.</p>
      </div>

      <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} autoMealEnabled={false} />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {totalCounts.map(({ period, count }) => (
          <button
            key={period}
            type="button"
            onClick={() => setActivePeriod(period)}
            className={`card text-left transition-all ${activePeriod === period ? 'ring-2 ring-primary' : 'hover:bg-bg-secondary'}`}
          >
            <div className="text-sm text-text-secondary">{MEAL_PERIOD_LABELS[period]}</div>
            <div className="text-3xl font-bold text-text-primary mt-1">{count.total}</div>
          </button>
        ))}
      </div>

      <MealToggle activePeriod={activePeriod} onPeriodChange={setActivePeriod} selectedDate={selectedDate} />

      <MealCounts counts={activeCount} onShowParticipants={() => setShowParticipantsModal(true)} />

      <div className="space-y-6">
        <AdminMealGrid
          members={members}
          meals={meals}
          selectedDate={selectedDate}
          loading={loading}
          onQuantityChange={handleQuantityChange}
        />

        <OcrMealImport
          selectedDate={selectedDate}
          members={members}
          onApplied={async () => {
            await fetchMeals(selectedDate);
          }}
        />

        <OcrHistory />

        <MealDetailsEditor
          period={activePeriod}
          details={currentDetails}
          updatedBy={mealDetails?.updated_by}
          updatedByName={mealDetails?.updated_by_name}
          updatedAt={mealDetails?.updated_at}
          onSave={handleSaveMealDetails}
        />

        <GroceryExpenseCard />

        <DepositSection />

        <MemberManagement />

        <AdminNotes />
      </div>

      <ParticipantsModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        participants={activeCount.participants}
      />
    </div>
  );
}

export default Home;
