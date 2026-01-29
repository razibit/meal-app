import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMealStore } from '../stores/mealStore';
import { getTodayDate } from '../utils/dateHelpers';
import { MealPeriod, getActivePeriod } from '../utils/cutoffChecker';
import DateSelector from '../components/home/DateSelector';
import MealToggle from '../components/home/MealToggle';
import MealCounts from '../components/home/MealCounts';
import MealRegistration from '../components/home/MealRegistration';
import MealDetailsEditor from '../components/home/MealDetailsEditor';
import NoticeBoard from '../components/home/NoticeBoard';
import ParticipantsModal from '../components/home/ParticipantsModal';

function Home() {
  const { user } = useAuthStore();
  const {
    mealDetails,
    members,
    loading,
    error,
    fetchMeals,
    fetchMealDetails,
    fetchMembers,
    addMeal,
    removeMeal,
    updateMealDetails,
    getMealCounts,
    hasUserRegistered,
    clearError,
  } = useMealStore();

  const [activePeriod, setActivePeriod] = useState<MealPeriod>(getActivePeriod());
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  
  // Memoize today's date for comparison
  const todayDate = useMemo(() => getTodayDate(), []);

  // Fetch initial data
  useEffect(() => {
    fetchMembers();
  }, []);

  // Fetch meals and meal details when date or period changes
  useEffect(() => {
    fetchMeals(selectedDate, activePeriod);
    fetchMealDetails(selectedDate);
  }, [activePeriod, selectedDate, fetchMeals, fetchMealDetails]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handlePeriodChange = useCallback((period: MealPeriod) => {
    setActivePeriod(period);
  }, []);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleRegisterMeal = useCallback(async () => {
    if (!user) return;
    try {
      await addMeal(user.id, selectedDate, activePeriod);
    } catch (error) {
      // Error is handled by store
      console.error('Failed to register meal:', error);
    }
  }, [user, selectedDate, activePeriod, addMeal]);

  const handleRemoveMeal = useCallback(async () => {
    if (!user) return;
    try {
      await removeMeal(user.id, selectedDate, activePeriod);
    } catch (error) {
      // Error is handled by store
      console.error('Failed to remove meal:', error);
    }
  }, [user, selectedDate, activePeriod, removeMeal]);

  const handleSaveMealDetails = useCallback(async (details: string) => {
    if (!user) return;
    const field = activePeriod === 'morning' ? 'morning_details' : 'night_details';
    await updateMealDetails(selectedDate, field, details, user.id);
  }, [user, selectedDate, activePeriod, updateMealDetails]);

  const handleSaveNotice = useCallback(async (notice: string) => {
    if (!user) return;
    await updateMealDetails(selectedDate, 'notice', notice, user.id);
  }, [user, selectedDate, updateMealDetails]);

  const handleShowParticipants = useCallback(() => {
    setShowParticipantsModal(true);
  }, []);

  const handleCloseParticipants = useCallback(() => {
    setShowParticipantsModal(false);
  }, []);

  // Memoize expensive calculations
  const mealCounts = useMemo(() => getMealCounts(), [getMealCounts]);
  const hasRegistered = useMemo(() => 
    user ? hasUserRegistered(user.id) : false, 
    [user, hasUserRegistered]
  );

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
      />

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
        hasRegistered={hasRegistered}
        isLoading={loading}
        onRegister={handleRegisterMeal}
        onRemove={handleRemoveMeal}
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

      {/* Notice Board */}
      <NoticeBoard
        notice={mealDetails?.notice || ''}
        updatedBy={mealDetails?.updated_by}
        updatedByName={mealDetails?.updated_by_name}
        updatedAt={mealDetails?.updated_at}
        onSave={handleSaveNotice}
      />

      {/* Participants Modal */}
      <ParticipantsModal
        isOpen={showParticipantsModal}
        onClose={handleCloseParticipants}
        participants={mealCounts.participants}
        allMembers={members}
      />
    </div>
  );
}

export default Home;
