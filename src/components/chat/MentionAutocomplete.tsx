import { useEffect, useRef } from 'react';
import type { Member } from '../../types';

interface MentionAutocompleteProps {
  query: string;
  members: Member[];
  onSelect: (member: Member) => void;
  position: { top: number; left: number };
  selectedIndex: number;
}

function MentionAutocomplete({
  query,
  members,
  onSelect,
  position,
  selectedIndex,
}: MentionAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Filter members by query
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(query.toLowerCase())
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  if (filteredMembers.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className="absolute z-50 bg-bg-primary border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{
        bottom: position.top,
        left: position.left,
        minWidth: '200px',
      }}
    >
      {filteredMembers.map((member, index) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onSelect(member)}
          className={`w-full text-left px-4 py-2 hover:bg-bg-tertiary transition-colors ${
            index === selectedIndex ? 'bg-bg-tertiary' : ''
          }`}
        >
          <div className="font-medium text-text-primary">{member.name}</div>
          <div className="text-xs text-text-secondary">{member.email}</div>
        </button>
      ))}
    </div>
  );
}

export default MentionAutocomplete;
