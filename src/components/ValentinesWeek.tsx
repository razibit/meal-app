import { useEffect, useState } from 'react';
import { getCurrentTimeInTimezone } from '../utils/dateHelpers';

interface ValentineDay {
  date: string; // Format: "2026-02-08"
  name: string;
  emoji: string;
  message: string;
  gradient: string;
  storageKey: string;
}

const VALENTINE_DAYS: ValentineDay[] = [
  {
    date: '2026-02-08',
    name: 'Propose Day',
    emoji: '💕',
    message: 'May today bring the courage to express your heart and the joy of connection.',
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    storageKey: 'valentine_propose_day_2026',
  },
  {
    date: '2026-02-09',
    name: 'Chocolate Day',
    emoji: '🍫',
    message: 'Life is like a box of chocolates, sweet and full of surprises!',
    gradient: 'from-amber-700 via-amber-600 to-yellow-700',
    storageKey: 'valentine_chocolate_day_2026',
  },
  {
    date: '2026-02-10',
    name: 'Teddy Day',
    emoji: '🧸',
    message: 'May your day be as warm and cuddly as a teddy bear hug!',
    gradient: 'from-amber-500 via-orange-400 to-amber-600',
    storageKey: 'valentine_teddy_day_2026',
  },
  {
    date: '2026-02-11',
    name: 'Promise Day',
    emoji: '🤝',
    message: 'A promise made is a debt unpaid. Cherish the bonds you hold dear.',
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    storageKey: 'valentine_promise_day_2026',
  },
  {
    date: '2026-02-12',
    name: 'Hug Day',
    emoji: '🤗',
    message: 'Hugs are the universal medicine. Spread warmth and comfort today!',
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    storageKey: 'valentine_hug_day_2026',
  },
  {
    date: '2026-02-13',
    name: 'Kiss Day',
    emoji: '💋',
    message: 'A kiss is a lovely trick designed by nature to stop speech when words become superfluous.',
    gradient: 'from-pink-600 via-fuchsia-500 to-purple-600',
    storageKey: 'valentine_kiss_day_2026',
  },
  {
    date: '2026-02-14',
    name: "Valentine's Day",
    emoji: '❤️',
    message: 'Love is not just looking at each other, it\'s looking in the same direction together.',
    gradient: 'from-red-600 via-rose-500 to-pink-500',
    storageKey: 'valentine_day_2026',
  },
];

export function ValentinesWeek() {
  const [currentDay, setCurrentDay] = useState<ValentineDay | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const now = getCurrentTimeInTimezone();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Find today's valentine day
    const today = VALENTINE_DAYS.find((day) => day.date === todayStr);
    
    if (today) {
      setCurrentDay(today);
      
      // Check if user has already seen today's popup
      const hasSeenToday = localStorage.getItem(today.storageKey);
      
      if (!hasSeenToday) {
        // Show popup after a short delay for better UX
        const timer = setTimeout(() => {
          setShowPopup(true);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleClose = () => {
    if (currentDay) {
      // Mark as seen for today
      localStorage.setItem(currentDay.storageKey, 'seen');
      setShowPopup(false);
    }
  };

  if (!showPopup || !currentDay) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className={`h-2 bg-gradient-to-r ${currentDay.gradient}`}></div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-md"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 text-gray-600 dark:text-gray-300"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Emoji */}
          <div className="text-6xl mb-4 animate-bounce-gentle">{currentDay.emoji}</div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {currentDay.name}
          </h2>

          {/* Date Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 mb-4">
            <span className="text-sm font-medium text-pink-700 dark:text-pink-300">
              {new Date(currentDay.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Message */}
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            {currentDay.message}
          </p>

          {/* Decorative Line */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-pink-300"></div>
            <span className="text-pink-400">✦</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-pink-300"></div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className={`px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r ${currentDay.gradient} hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ HEADER THEME INDICATOR ============
export function ValentineThemeIndicator() {
  const [currentDay, setCurrentDay] = useState<ValentineDay | null>(null);

  useEffect(() => {
    const now = getCurrentTimeInTimezone();
    const todayStr = now.toISOString().split('T')[0];

    const today = VALENTINE_DAYS.find((day) => day.date === todayStr);
    if (today) {
      setCurrentDay(today);
    }
  }, []);

  if (!currentDay) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 ml-2 md:ml-3 px-2 md:px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 animate-pulse-gentle">
      <span className="text-sm md:text-base">{currentDay.emoji}</span>
      <span className="text-[10px] md:text-xs font-medium text-pink-700 dark:text-pink-300 whitespace-nowrap">
        {currentDay.name}
      </span>
    </div>
  );
}
