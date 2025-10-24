import { useEffect } from 'react';
import { Member } from '../../types';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Array<{ id: string; name: string; rice_preference: string }>;
  allMembers: Member[];
}

function ParticipantsModal({
  isOpen,
  onClose,
  participants,
  allMembers,
}: ParticipantsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const participantIds = new Set(participants.map((p) => p.id));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">
            Participants ({participants.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close modal"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-3">
            {allMembers.map((member) => {
              const hasParticipated = participantIds.has(member.id);
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    hasParticipated
                      ? 'bg-green-900 bg-opacity-30 border border-green-700'
                      : 'bg-gray-700'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      hasParticipated
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name and preference */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-100">{member.name}</div>
                    <div className="text-sm text-gray-400">
                      {member.rice_preference === 'boiled' ? 'Boiled Rice' : 'Atop Rice'}
                    </div>
                  </div>

                  {/* Status indicator */}
                  {hasParticipated && (
                    <svg
                      className="w-5 h-5 text-green-500"
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParticipantsModal;
