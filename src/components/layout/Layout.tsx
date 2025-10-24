import { ReactNode, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';

interface LayoutProps {
  children?: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [showMembersModal, setShowMembersModal] = useState(false);

  const handlePeopleClick = () => {
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Side Navigation for Desktop */}
      <Navigation />

      {/* Main Content Area */}
      <div className="md:ml-20 flex flex-col min-h-screen">
        {/* Header */}
        <Header onPeopleClick={handlePeopleClick} />

        {/* Content Area */}
        <main className="flex-1 pb-16 md:pb-0">
          {children || <Outlet />}
        </main>

        {/* Bottom Navigation for Mobile */}
        {/* Navigation component handles its own positioning */}
      </div>

      {/* Members Modal - Placeholder for now */}
      {showMembersModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseMembersModal}
        >
          <div
            className="bg-bg-primary rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">All Members</h2>
              <button
                onClick={handleCloseMembersModal}
                className="text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-text-secondary">
                Members list will be populated from the database.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
