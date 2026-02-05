import { useState, useEffect, useRef } from 'react';
import { getCurrentTimeInTimezone, formatDate, formatDateForDisplay } from '../../utils/dateHelpers';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  autoMealEnabled?: boolean;
}

/**
 * Get array of next 7 days (including today)
 */
function getNext7Days(): Date[] {
  const today = getCurrentTimeInTimezone();
  const days: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  
  return days;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateStr(): string {
  return formatDate(getCurrentTimeInTimezone());
}

function DateSelector({ selectedDate, onDateChange, autoMealEnabled = false }: DateSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  // Ref should include BOTH the toggle button and the dropdown.
  // Otherwise a click on the button counts as "outside" (mousedown closes, then click re-opens).
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const availableDays = getNext7Days();
  const todayStr = getTodayDateStr();
  
  // Find current index in the 7-day range
  const currentIndex = availableDays.findIndex(
    (day) => formatDate(day) === selectedDate
  );
  
  // Check if next day would be in the future
  const nextDayIsFuture = currentIndex >= 0 && 
    currentIndex < availableDays.length - 1 && 
    formatDate(availableDays[currentIndex + 1]) > todayStr;
  
  // Determine if navigation arrows should be active
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < availableDays.length - 1 && 
                       currentIndex !== -1 && 
                       !(autoMealEnabled && nextDayIsFuture);
  
  // Parse selected date for display
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const displayText = formatDateForDisplay(selectedDateObj);
  
  // Handle navigation
  const goToPrevDay = () => {
    if (canGoBack) {
      const newDate = formatDate(availableDays[currentIndex - 1]);
      onDateChange(newDate);
    }
  };
  
  const goToNextDay = () => {
    if (canGoForward) {
      const newDate = formatDate(availableDays[currentIndex + 1]);
      onDateChange(newDate);
    }
  };
  
  // Handle calendar day click
  const handleDayClick = (date: Date) => {
    const dateStr = formatDate(date);
    // Prevent selecting future dates when auto meal is enabled
    if (autoMealEnabled && dateStr > todayStr) {
      return;
    }
    onDateChange(dateStr);
    setShowCalendar(false);
  };
  
  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);
  
  // Close calendar on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCalendar(false);
      }
    };
    
    if (showCalendar) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showCalendar]);

  return (
    <div className="mb-6">
      <div
        ref={calendarContainerRef}
        className="flex items-center justify-center gap-3 bg-bg-secondary p-3 rounded-lg relative"
      >
        {/* Left Arrow */}
        <button
          onClick={goToPrevDay}
          disabled={!canGoBack}
          className={`
            p-2 rounded-lg transition-all min-h-touch min-w-[44px] flex items-center justify-center
            ${canGoBack 
              ? 'text-primary hover:bg-bg-tertiary active:scale-95 cursor-pointer' 
              : 'text-text-tertiary opacity-40 cursor-not-allowed'
            }
          `}
          aria-label="Previous day"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        
        {/* Date Display (Clickable) */}
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="flex-1 text-center py-2 px-4 rounded-lg hover:bg-bg-tertiary transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
              {displayText}
            </span>
            <svg
              className={`w-5 h-5 text-text-secondary group-hover:text-primary transition-all ${showCalendar ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          {selectedDate !== todayStr && (
            <span className="text-xs text-primary font-medium">
              (Future meal)
            </span>
          )}
        </button>
        
        {/* Right Arrow */}
        <button
          onClick={goToNextDay}
          disabled={!canGoForward}
          className={`
            p-2 rounded-lg transition-all min-h-touch min-w-[44px] flex items-center justify-center
            ${canGoForward 
              ? 'text-primary hover:bg-bg-tertiary active:scale-95 cursor-pointer' 
              : 'text-text-tertiary opacity-40 cursor-not-allowed'
            }
          `}
          aria-label="Next day"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        
        {/* Calendar Dropdown */}
        {showCalendar && (
          <div
            className="absolute top-full left-0 right-0 mt-2 bg-bg-primary border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-slide-down"
          >
            <div className="p-2">
              <div className="text-xs font-medium text-text-secondary px-2 py-1 mb-1">
                Select a day (next 7 days)
              </div>
              <div className="space-y-1">
                {availableDays.map((day, index) => {
                  const dateStr = formatDate(day);
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === todayStr;
                  const isFuture = dateStr > todayStr;
                  const isDisabled = autoMealEnabled && isFuture;
                  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = day.getDate();
                  const monthName = day.toLocaleDateString('en-US', { month: 'short' });
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(day)}
                      disabled={isDisabled}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                        ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-bg-tertiary/50 text-text-tertiary' 
                          : isSelected 
                            ? 'bg-primary text-white' 
                            : 'hover:bg-bg-tertiary text-text-primary cursor-pointer'
                        }
                      `}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${isDisabled
                          ? 'bg-bg-tertiary/30 text-text-tertiary'
                          : isSelected 
                            ? 'bg-white/20' 
                            : isToday 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-bg-tertiary'
                        }
                      `}>
                        {dayNum}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${isDisabled ? 'text-text-tertiary' : isSelected ? 'text-white' : ''}`}>
                          {dayName}, {monthName} {dayNum}
                        </div>
                        {isToday && (
                          <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                            Today
                          </div>
                        )}
                        {index > 0 && !isToday && (
                          <div className={`text-xs ${isDisabled ? 'text-text-tertiary' : isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                            {index === 1 ? 'Tomorrow' : `In ${index} days`}
                            {isDisabled && ' (Auto Meal)'}
                          </div>
                        )}
                      </div>
                      {isSelected && (
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DateSelector;
