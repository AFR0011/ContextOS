import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Star, Plus, X, CalendarDays, FolderKanban, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { TaskRow, EmptyState } from '../components/Shared';
import { getDomainName, getDomainColor, isOverdue, getWeekKey, isThisWeekDate, PROJECT_STATUS_CONFIG } from '../utils/helpers';
import type { TaskStatus } from '../types';

export default function ThisWeekPage() {
  const { navigate, tasks, projects, deadlines, domains, weeklyPriorities,
    addWeeklyPriority, removeWeeklyPriority, toggleWeeklyPriority, updateTask } = useStore();
  const weekKey = getWeekKey();
  const priorities = weeklyPriorities[weekKey] || [];
  const [newPriority, setNewPriority] = useState('');

  const activeTasks = useMemo(() =>
    tasks.filter(t => !t.trashedAt && !t.archivedAt && t.status !== 'done' && t.status !== 'dropped'), [tasks]);

  const overdueTasks = useMemo(() => activeTasks.filter(t => isOverdue(t)), [activeTasks]);

  const weekTasks = useMemo(() => activeTasks.filter(t =>
    (t.dueDate && isThisWeekDate(t.dueDate)) || (t.plannedDate && isThisWeekDate(t.plannedDate))
  ).map(t => {
    const labels: string[] = [];
    if (isOverdue(t)) labels.push('Overdue');
    else if (t.dueDate && isThisWeekDate(t.dueDate)) labels.push('Due This Week');
    if (t.plannedDate && isThisWeekDate(t.plannedDate)) labels.push('Planned');
    if (t.domainId) labels.push(getDomainName(t.domainId, domains));
    return { task: t, labels };
  }), [activeTasks, domains]);

  const weekDeadlines = deadlines.filter(d => !d.trashedAt && isThisWeekDate(d.date));
  const activeProjects = projects.filter(p => !p.trashedAt && p.status === 'active');
  const handleStatusChange = (id: string, status: TaskStatus) => updateTask(id, { status });
  const handleAddPriority = () => { if (!newPriority.trim()) return; addWeeklyPriority(weekKey, newPriority.trim()); setNewPriority(''); };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">This Week</h1>
      <p className="mt-1 text-sm text-gray-500">Week of {format(parseISO(weekKey), 'MMMM d, yyyy')}</p>

      <div className="mt-6">
        <div className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /><h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Weekly Priorities</h2></div>
        <div className="mt-3 space-y-1">
          {priorities.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-1.5 group">
              <button onClick={() => toggleWeeklyPriority(weekKey, p.id)} className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${p.done ? 'bg-amber-500 border-amber-500' : 'border-amber-300'}`}>
                {p.done && <span className="text-white text-xs">✓</span>}
              </button>
              <span className={`text-sm ${p.done ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>{p.text}</span>
              <button onClick={() => removeWeeklyPriority(weekKey, p.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <input value={newPriority} onChange={e => setNewPriority(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPriority()}
              placeholder="Add weekly priority..." className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-amber-300 py-1 bg-transparent placeholder:text-gray-400" />
            <button onClick={handleAddPriority} className="text-amber-600 hover:text-amber-700"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overdue</h2><span className="text-xs text-red-500">({overdueTasks.length})</span></div>
          <div className="mt-2 bg-white rounded-xl border border-red-200 divide-y divide-red-50 overflow-hidden">
            {overdueTasks.map(t => <TaskRow key={t.id} task={t} labels={['Overdue', ...(t.domainId ? [getDomainName(t.domainId, domains)] : [])]} onStatusChange={handleStatusChange} />)}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-500" /><h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tasks This Week</h2><span className="text-xs text-gray-400">({weekTasks.length})</span></div>
        <div className="mt-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {weekTasks.map(({ task, labels }) => <TaskRow key={task.id} task={task} labels={labels} onStatusChange={handleStatusChange} />)}
          {weekTasks.length === 0 && <EmptyState icon={CalendarDays} title="No tasks this week" />}
        </div>
      </div>

      {weekDeadlines.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deadlines This Week</h2>
          <div className="mt-2 space-y-2">
            {weekDeadlines.map(d => (
              <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium text-amber-800">{d.title}</span>
                <span className="text-amber-600 text-xs">{format(parseISO(d.date), 'EEE, MMM d')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-emerald-500" /><h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Projects</h2></div>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeProjects.slice(0, 6).map(p => (
            <button key={p.id} onClick={() => navigate('project-detail', p.id)}
              className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_CONFIG[p.status].color}`}>{PROJECT_STATUS_CONFIG[p.status].label}</span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${getDomainColor(p.domainId, domains)}`}>{getDomainName(p.domainId, domains)}</span>
              {p.nextAction && <p className="text-xs text-indigo-600 mt-1 truncate">→ {p.nextAction}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
