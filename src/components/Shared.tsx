import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../utils/helpers';
import type { Task, TaskStatus } from '../types';

export function TaskRow({ task, labels = [], onStatusChange, onClick }: {
  task: Task;
  labels?: string[];
  onStatusChange?: (id: string, status: TaskStatus) => void;
  onClick?: () => void;
}) {
  const isDone = task.status === 'done';
  return (
    <div
      className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors group ${onClick ? 'cursor-pointer' : ''} hover:bg-gray-50`}
      onClick={onClick}
    >
      <button
        onClick={e => { e.stopPropagation(); onStatusChange?.(task.id, isDone ? 'todo' : 'done'); }}
        className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors
          ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        {isDone && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
        {labels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {labels.map(label => (
              <span key={label} className={`text-[11px] font-medium px-1.5 py-0.5 rounded
                ${label === 'Overdue' ? 'bg-red-50 text-red-600' :
                  label === 'Due Today' ? 'bg-amber-50 text-amber-700' :
                  label === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                  label === 'Planned Today' || label === 'Planned' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-gray-100 text-gray-600'}`}
              >{label}</span>
            ))}
          </div>
        )}
      </div>
      {onStatusChange && (
        <select
          value={task.status}
          onChange={e => { e.stopPropagation(); onStatusChange(task.id, e.target.value as TaskStatus); }}
          onClick={e => e.stopPropagation()}
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${TASK_STATUS_CONFIG[task.status].color}`}
        >
          {Object.entries(TASK_STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export function CollapsibleSection({ title, children, defaultOpen = false, count, action }: {
  title: string; children: ReactNode; defaultOpen?: boolean; count?: number; action?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-6">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left group/sec">
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover/sec:text-gray-700">{title}</h3>
        {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
        {action && <div className="ml-auto" onClick={e => e.stopPropagation()}>{action}</div>}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: any; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="text-center py-8">
      <Icon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
