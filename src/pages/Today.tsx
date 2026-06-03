import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Star, Plus, X, Clock, CalendarCheck, BookOpen } from 'lucide-react';
import { useStore } from '../store';
import { TaskRow, EmptyState } from '../components/Shared';
import { getDomainName, isOverdue, getTodayStr, isTodayDate } from '../utils/helpers';
import type { TaskStatus } from '../types';

export default function TodayPage() {
  const { navigate, tasks, deadlines, domains, projects, dailyPriorities,
    addDailyPriority, removeDailyPriority, toggleDailyPriority, updateTask } = useStore();
  const today = getTodayStr();
  const priorities = dailyPriorities[today] || [];
  const [newPriority, setNewPriority] = useState('');

  const activeTasks = useMemo(() =>
    tasks.filter(t => !t.trashedAt && !t.archivedAt && t.status !== 'done' && t.status !== 'dropped'), [tasks]);

  const taskList = useMemo(() => {
    const seen = new Set<string>();
    const result: { task: typeof tasks[0]; labels: string[] }[] = [];
    activeTasks.filter(t => isOverdue(t)).forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); const l = ['Overdue']; if (t.domainId) l.push(getDomainName(t.domainId, domains)); result.push({ task: t, labels: l }); } });
    activeTasks.filter(t => t.dueDate === today && !isOverdue(t)).forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); const l = ['Due Today']; if (t.domainId) l.push(getDomainName(t.domainId, domains)); result.push({ task: t, labels: l }); } });
    activeTasks.filter(t => t.plannedDate === today && !isOverdue(t)).forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); const l = ['Planned Today']; if (t.domainId) l.push(getDomainName(t.domainId, domains)); result.push({ task: t, labels: l }); } });
    activeTasks.filter(t => t.status === 'in-progress').forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); const l = ['In Progress']; if (t.domainId) l.push(getDomainName(t.domainId, domains)); result.push({ task: t, labels: l }); } });
    return result;
  }, [activeTasks, today, domains]);

  const todayDeadlines = deadlines.filter(d => !d.trashedAt && isTodayDate(d.date));
  const handleStatusChange = (id: string, status: TaskStatus) => updateTask(id, { status });
  const handleAddPriority = () => { if (!newPriority.trim()) return; addDailyPriority(today, newPriority.trim()); setNewPriority(''); };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today</h1>
          <p className="mt-1 text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button onClick={() => navigate('reviews')}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
          <BookOpen className="w-4 h-4" /> Daily Review
        </button>
      </div>

      {/* Priorities */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Top Priorities</h2>
        </div>
        <div className="mt-3 space-y-1">
          {priorities.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-1.5 group">
              <button onClick={() => toggleDailyPriority(today, p.id)}
                className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${p.done ? 'bg-amber-500 border-amber-500' : 'border-amber-300 hover:border-amber-400'}`}>
                {p.done && <span className="text-white text-xs">✓</span>}
              </button>
              <span className={`text-sm ${p.done ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>{p.text}</span>
              <button onClick={() => removeDailyPriority(today, p.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <input value={newPriority} onChange={e => setNewPriority(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPriority()}
              placeholder={priorities.length >= 3 ? 'Maximum 3 priorities' : 'Add a priority...'}
              disabled={priorities.length >= 3}
              className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-amber-300 py-1 bg-transparent placeholder:text-gray-400 disabled:opacity-50" />
            <button onClick={handleAddPriority} disabled={priorities.length >= 3} className="text-amber-600 hover:text-amber-700 disabled:opacity-50">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-indigo-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tasks</h2>
          <span className="text-xs text-gray-400">({taskList.length})</span>
        </div>
        <div className="mt-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {taskList.map(({ task, labels }) => (
            <TaskRow key={task.id} task={task} labels={labels} onStatusChange={handleStatusChange} />
          ))}
          {taskList.length === 0 && <EmptyState icon={Clock} title="No tasks for today" description="Add tasks or plan your day" />}
        </div>
      </div>

      {/* Deadlines */}
      {todayDeadlines.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deadlines Today</h2>
          <div className="mt-2 space-y-2">
            {todayDeadlines.map(d => (
              <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <span className="font-medium text-amber-800">{d.title}</span>
                {d.projectId && <span className="text-amber-600 ml-2">({projects.find(p => p.id === d.projectId)?.name})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
