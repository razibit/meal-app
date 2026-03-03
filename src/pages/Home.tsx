import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMealStore } from '../stores/mealStore';
import { useEggStore } from '../stores/eggStore';
import { getTodayDate } from '../utils/dateHelpers';
import { MealPeriod, getActivePeriod, isCutoffPassed } from '../utils/cutoffChecker';
import DateSelector from '../components/home/DateSelector';
import MealToggle from '../components/home/MealToggle';
import MealCounts from '../components/home/MealCounts';
import MealRegistration from '../components/home/MealRegistration';
import MealDetailsEditor from '../components/home/MealDetailsEditor';
import GroceryExpenseCard from '../components/home/GroceryExpenseCard';
import ParticipantsModal from '../components/home/ParticipantsModal';

function Home() {
  const { user } = useAuthStore();
  const {
    mealDetails,
    loading,
    error,
    fetchMeals,
    fetchMealDetails,
    fetchMembers,
    updateMealQuantity,
    updateAutoMeal,
    updateMealDetails,
    getMealCounts,
    getUserMealQuantity,
    getUserAutoMeal,
    getUserAutoMealQuantity,
    updateAutoMealQuantity,
    clearError,
  } = useMealStore();

  const { fetchEggs } = useEggStore();

  const [activePeriod, setActivePeriod] = useState<MealPeriod>(getActivePeriod());
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [showNotice, setShowNotice] = useState(true);
  const [noticeVisible, setNoticeVisible] = useState(true);

  // Auto-dismiss notice after 8 seconds
  useEffect(() => {
    if (!showNotice) return;
    const fadeTimer = setTimeout(() => setNoticeVisible(false), 7000);
    const removeTimer = setTimeout(() => setShowNotice(false), 7600);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [showNotice]);

  const handleDismissNotice = useCallback(() => {
    setNoticeVisible(false);
    setTimeout(() => setShowNotice(false), 600);
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchMembers();
  }, []);

  // Fetch meals and meal details when date or period changes
  useEffect(() => {
    fetchMeals(selectedDate, activePeriod);
    fetchMealDetails(selectedDate);
    fetchEggs(selectedDate);
  }, [activePeriod, selectedDate, fetchMeals, fetchMealDetails, fetchEggs]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handlePeriodChange = useCallback((period: MealPeriod) => {
    setActivePeriod(period);
  }, []);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleSaveQuantity = useCallback(async (quantity: number) => {
    if (!user) return;
    try {
      await updateMealQuantity(user.id, selectedDate, activePeriod, quantity);
    } catch (error) {
      // Error is handled by store
      console.error('Failed to update meal quantity:', error);
      throw error;
    }
  }, [user, selectedDate, activePeriod, updateMealQuantity]);

  const handleToggleAutoMeal = useCallback(async (enabled: boolean) => {
    if (!user) return;
    try {
      await updateAutoMeal(user.id, activePeriod, enabled);
    } catch (error) {
      // Error is handled by store
      console.error('Failed to toggle auto meal:', error);
      throw error;
    }
  }, [user, activePeriod, updateAutoMeal]);

  const handleSaveAutoMealQuantity = useCallback(async (quantity: number) => {
    if (!user) return;
    try {
      await updateAutoMealQuantity(user.id, activePeriod, quantity);
    } catch (error) {
      console.error('Failed to update auto meal quantity:', error);
      throw error;
    }
  }, [user, activePeriod, updateAutoMealQuantity]);

  const handleSaveMealDetails = useCallback(async (details: string) => {
    if (!user) return;
    const field = activePeriod === 'morning' ? 'morning_details' : 'night_details';
    await updateMealDetails(selectedDate, field, details, user.id);
  }, [user, selectedDate, activePeriod, updateMealDetails]);

  const handleShowParticipants = useCallback(() => {
    setShowParticipantsModal(true);
  }, []);

  const handleCloseParticipants = useCallback(() => {
    setShowParticipantsModal(false);
  }, []);

  // Derived values from the store; compute on render so updates reflect immediately
  // (These functions read current Zustand state internally.)
  const mealCounts = getMealCounts(activePeriod, selectedDate);
  const currentQuantity = user ? getUserMealQuantity(user.id, activePeriod, selectedDate) : 0;
  const autoMealEnabled = user ? getUserAutoMeal(user.id, activePeriod) : true;
  const autoMealQuantity = user ? getUserAutoMealQuantity(user.id, activePeriod) : 1;
  const cutoffPassed = useMemo(() => 
    isCutoffPassed(activePeriod, selectedDate), 
    [activePeriod, selectedDate]
  );

  const isFutureDate = useMemo(() => {
    const today = getTodayDate();
    return selectedDate > today;
  }, [selectedDate]);

  const currentDetails = useMemo(() => 
    activePeriod === 'morning'
      ? mealDetails?.morning_details || ''
      : mealDetails?.night_details || '',
    [activePeriod, mealDetails]
  );

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in">
      {/* Error Toast */}
      {error && (
        <div className="mb-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg flex items-center justify-between animate-slide-down">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-200 hover:text-white"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Date Selector - Navigate next 7 days */}
      <DateSelector
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        autoMealEnabled={autoMealEnabled}
      />

      {/* Notice Banner */}
      {showNotice && (
        <div
          className={`mb-4 bg-red-600 text-white px-4 py-3 rounded-lg text-center font-semibold text-sm shadow-lg flex items-center justify-between gap-3 transition-all duration-500 ${
            noticeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <span className="flex-1">
            আপনি চাইলে নিজে থেকেও মার্চ ৪ ও ৫ তারিখের মিল সেট করে রাখতে পারেন ! আবার ফেসবুকে বলে থাকলেও হবে !!
          </span>
          <button
            onClick={handleDismissNotice}
            className="shrink-0 text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss notice"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Meal Toggle */}
      <MealToggle
        activePeriod={activePeriod}
        onPeriodChange={handlePeriodChange}
        selectedDate={selectedDate}
      />

      {/* Meal Counts */}
      <MealCounts
        counts={mealCounts}
        onShowParticipants={handleShowParticipants}
      />

      {/* Meal Registration */}
      <MealRegistration
        period={activePeriod}
        currentQuantity={currentQuantity}
        autoMealEnabled={autoMealEnabled}
        autoMealQuantity={autoMealQuantity}
        isLoading={loading}
        isCutoffPassed={cutoffPassed}
        isFutureDate={isFutureDate}
        onSaveQuantity={handleSaveQuantity}
        onToggleAutoMeal={handleToggleAutoMeal}
        onSaveAutoMealQuantity={handleSaveAutoMealQuantity}
      />

      {/* Meal Details Editor */}
      <MealDetailsEditor
        period={activePeriod}
        details={currentDetails}
        updatedBy={mealDetails?.updated_by}
        updatedByName={mealDetails?.updated_by_name}
        updatedAt={mealDetails?.updated_at}
        onSave={handleSaveMealDetails}
      />

      {/* Grocery Expense Card */}
      <GroceryExpenseCard />

      {/* Participants Modal */}
      <ParticipantsModal
        isOpen={showParticipantsModal}
        onClose={handleCloseParticipants}
        participants={mealCounts.participants}
      />
    </div>
  );
}

export default Home;
