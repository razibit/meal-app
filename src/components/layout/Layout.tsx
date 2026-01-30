import { ReactNode, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import { OfflineIndicator } from './OfflineIndicator';
import { TimeSyncIndicator } from './TimeSyncIndicator';
import { useMembers } from '../../hooks/useMembers';

interface LayoutProps {
  children?: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [showMembersModal, setShowMembersModal] = useState(false);
  const { members, loading, error } = useMembers();

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

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Time Sync Indicator */}
      <TimeSyncIndicator />

      {/* Members Modal - Placeholder for now */}
      {showMembersModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={handleCloseMembersModal}
        >
          <div
            className="bg-bg-primary rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">All Members</h2>
              <button
                onClick={handleCloseMembersModal}
                className="text-text-secondary hover:text-text-primary transition-colors min-w-touch min-h-touch flex items-center justify-center"
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

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Members List */}
            {!loading && !error && (
              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-text-secondary text-center py-4">No members found</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 bg-bg-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{member.name}</p>
                          <p className="text-sm text-text-secondary">{member.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary capitalize">
                            {member.rice_preference}
                          </span>
                          {member.role === 'admin' && (
                            <span className="ml-2 inline-block px-2 py-1 text-xs rounded-full bg-accent/10 text-accent">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                      {member.phone && (
                        <p className="text-sm text-text-secondary mt-1">{member.phone}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
