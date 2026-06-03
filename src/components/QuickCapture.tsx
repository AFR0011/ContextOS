import { useState, useRef } from 'react';
import { Zap, Send } from 'lucide-react';
import { useStore } from '../store';

const CAPTURE_COMMANDS = [
  { cmd: '/task', desc: 'Create a task', icon: '☑️' },
  { cmd: '/note', desc: 'Create a note', icon: '📝' },
  { cmd: '/project', desc: 'Create a project', icon: '📁' },
  { cmd: '/deadline', desc: 'Create a deadline', icon: '📅' },
  { cmd: '/status', desc: 'Update a status', icon: '📊' },
];

export default function QuickCapture() {
  const [text, setText] = useState('');
  const [showCmds, setShowCmds] = useState(false);
  const [flash, setFlash] = useState(false);
  const addCapture = useStore(s => s.addCapture);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCmds = text.startsWith('/')
    ? CAPTURE_COMMANDS.filter(c => c.cmd.startsWith(text.split(' ')[0].toLowerCase()))
    : [];

  const handleSubmit = () => {
    if (!text.trim()) return;
    addCapture(text.trim());
    setText('');
    setShowCmds(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 bg-white border rounded-xl px-4 py-3 shadow-sm transition-all
        ${flash ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100'}
      `}>
        <Zap className={`w-5 h-5 shrink-0 transition-colors ${flash ? 'text-emerald-500' : 'text-indigo-500'}`} />
        <input
          ref={inputRef}
          value={text}
          onChange={e => {
            setText(e.target.value);
            const v = e.target.value;
            setShowCmds(v.startsWith('/') && CAPTURE_COMMANDS.some(c => c.cmd.startsWith(v.split(' ')[0].toLowerCase())));
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !showCmds) handleSubmit();
            if (e.key === 'Escape') { setShowCmds(false); setText(''); }
          }}
          onFocus={() => {
            if (text.startsWith('/') && filteredCmds.length > 0) setShowCmds(true);
          }}
          placeholder="Quick capture... (type / for commands)"
          className="flex-1 outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent min-w-0"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="text-indigo-600 hover:text-indigo-700 disabled:text-gray-300 transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {showCmds && filteredCmds.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
          {filteredCmds.map(cmd => (
            <button
              key={cmd.cmd}
              onClick={() => {
                setText(cmd.cmd + ' ');
                setShowCmds(false);
                inputRef.current?.focus();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 text-left text-sm transition-colors"
            >
              <span className="text-base">{cmd.icon}</span>
              <span className="font-mono font-medium text-indigo-700">{cmd.cmd}</span>
              <span className="text-gray-500">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
