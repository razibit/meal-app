import { useEffect, useState } from 'react';
import { getCurrentTimeInTimezone, formatDate as formatDateStr } from '../../utils/dateHelpers';
import EggCounter from '../home/EggCounter';

interface HeaderProps {
  onPeopleClick: () => void;
}

function Header({ onPeopleClick }: HeaderProps) {
  const [now, setNow] = useState<Date>(() => getCurrentTimeInTimezone());
  const todayDate = formatDateStr(getCurrentTimeInTimezone());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(getCurrentTimeInTimezone());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  // Format current date
  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return now.toLocaleDateString('en-US', options);
  };

  const formatTime12h = () => {
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <header className="bg-bg-primary border-b border-border sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Current Date */}
        <div className="flex-1">
          <h1 className="text-lg md:text-xl font-semibold text-text-primary">
            {formatDate()}
            <span className="ml-3 inline-flex items-center rounded-full bg-bg-tertiary/70 px-3 py-1 text-base md:text-lg font-semibold text-text-primary tabular-nums">
              {formatTime12h()}
            </span>
            <span className="ml-2">
              <EggCounter date={todayDate} />
            </span>
          </h1>
        </div>

        {/* People Icon Button */}
        <button
          onClick={onPeopleClick}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-bg-tertiary transition-colors"
          aria-label="View all members"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Header;
