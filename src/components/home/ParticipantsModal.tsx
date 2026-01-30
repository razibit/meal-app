import { useEffect } from 'react';
import { Member } from '../../types';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Array<{ id: string; name: string; rice_preference: string; quantity: number }>;
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

  // Create a map of participant id to quantity
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary rounded-lg max-w-md w-full max-h-[80vh] flex flex-col shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary">
            Participants ({participants.length})
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors min-w-touch min-h-touch flex items-center justify-center"
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
            {participants.length === 0 ? (
              <div className="text-center text-text-secondary py-8">
                No participants with meals for this period
              </div>
            ) : (
              participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors bg-bg-tertiary"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-bg-secondary text-text-secondary">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name and preference */}
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{participant.name}</div>
                    <div className="text-sm text-text-secondary">
                      {participant.rice_preference === 'boiled' ? 'Boiled Rice' : 'Atop Rice'}
                    </div>
                  </div>

                  {/* Meal quantity */}
                  <div className="text-2xl font-bold text-text-primary">
                    {participant.quantity}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={onClose}
            className="btn-primary w-full"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParticipantsModal;
