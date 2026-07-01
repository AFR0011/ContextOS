import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import type { SlashCommand } from '../types';

interface SlashMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  position: { x: number; y: number };
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
  commands,
  selectedIndex,
  position,
  onSelect,
  onHover,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Adjust position to keep menu on screen
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y + 4, window.innerHeight - 360),
    zIndex: 50,
  };

  if (commands.length === 0) {
    return (
      <div
        ref={menuRef}
        style={menuStyle}
        className="slash-menu-enter bg-white rounded-xl shadow-lg border border-gray-200 w-72 p-3"
      >
        <p className="text-sm text-gray-400 text-center py-2">No matching commands</p>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="slash-menu-enter bg-white rounded-xl shadow-lg border border-gray-200 w-72 overflow-hidden"
    >
      <div className="px-3 pt-2.5 pb-1.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic blocks</p>
      </div>
      <div className="slash-menu max-h-72 overflow-y-auto pb-1.5 px-1.5">
        {commands.map((cmd, index) => (
          <button
            key={cmd.type}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors duration-75',
              index === selectedIndex
                ? 'bg-blue-50 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            )}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(e) => {
              e.preventDefault(); // Don't steal focus
              onSelect(index);
            }}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 text-base',
                index === selectedIndex
                  ? 'bg-white border-blue-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200'
              )}
            >
              <span className={cn(
                'font-semibold',
                cmd.icon.length <= 2 && cmd.icon !== '💡' ? 'text-sm' : 'text-base'
              )}>
                {cmd.icon}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{cmd.label}</p>
              <p className="text-xs text-gray-400 truncate">{cmd.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
