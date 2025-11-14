import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '../../utils/dateHelpers';

interface NoticeBoardProps {
  notice: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
  onSave: (notice: string) => Promise<void>;
}

function NoticeBoard({ notice, updatedBy, updatedByName, updatedAt, onSave }: NoticeBoardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(notice);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(notice);
  }, [notice]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = async () => {
    if (value !== notice) {
      setIsSaving(true);
      try {
        await onSave(value);
      } catch (error) {
        setValue(notice);
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue(notice);
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-text-primary">Notice Board</h3>
          {isSaving && (
            <span className="text-sm text-primary flex items-center gap-1">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          )}
        </div>

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Click to add a notice..."
            className="input w-full min-h-[100px] max-h-[150px] resize-y"
            rows={3}
          />
        ) : (
          <div
            onClick={handleClick}
            className="w-full bg-bg-tertiary text-text-primary rounded-lg p-4 min-h-[100px] cursor-pointer hover:bg-bg-secondary transition-colors"
          >
            {value || (
              <span className="text-text-tertiary italic">Click to add a notice...</span>
            )}
          </div>
        )}

        {updatedAt && (
          <div className="mt-2 text-xs text-text-tertiary">
            Last edited by {updatedByName || updatedBy || 'Unknown'} {formatRelativeTime(new Date(updatedAt))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoticeBoard;
