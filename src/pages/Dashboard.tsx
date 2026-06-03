import { useState, useMemo } from 'react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ArrowRight, Star, Plus, X, Sparkles, Inbox as InboxIcon, AlertTriangle, Clock, CalendarDays } from 'lucide-react';
import { useStore } from '../store';
import QuickCapture from '../components/QuickCapture';
import { TaskRow, CollapsibleSection } from '../components/Shared';
import { getDomainName, getDomainColor, isOverdue, getTodayStr, isThisWeekDate, PROJECT_STATUS_CONFIG, CAPTURE_TYPE_LABELS } from '../utils/helpers';
import type { TaskStatus } from '../types';

export default function Dashboard() {
  const { navigate, tasks, projects, captures, deadlines, domains, dailyPriorities,
    addDailyPriority, removeDailyPriority, toggleDailyPriority, updateTask } = useStore();
  const today = getTodayStr();
  const priorities = dailyPriorities[today] || [];
  const [newPriority, setNewPriority] = useState('');

  const activeTasks = useMemo(() =>
    tasks.filter(t => !t.trashedAt && !t.archivedAt && t.status !== 'done' && t.status !== 'dropped'), [tasks]);

  const overdueTasks = useMemo(() => activeTasks.filter(t => isOverdue(t)), [activeTasks]);
  const overdueIds = useMemo(() => new Set(overdueTasks.map(t => t.id)), [overdueTasks]);

  const todayTasks = useMemo(() => activeTasks
    .filter(t => !overdueIds.has(t.id) && ((t.dueDate && t.dueDate === today) || (t.plannedDate && t.plannedDate === today) || t.status === 'in-progress'))
    .map(t => {
      const labels: string[] = [];
      if (t.dueDate === today) labels.push('Due Today');
      if (t.plannedDate === today) labels.push('Planned');
      if (t.status === 'in-progress') labels.push('In Progress');
      if (t.domainId) labels.push(getDomainName(t.domainId, domains));
      return { task: t, labels };
    }), [activeTasks, overdueIds, today, domains]);

  const inboxItems = captures.filter(c => c.status === 'unprocessed').slice(0, 5);
  const inboxTotal = captures.filter(c => c.status === 'unprocessed').length;

  const recentProjects = useMemo(() =>
    projects.filter(p => !p.trashedAt && p.status === 'active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5), [projects]);

  const weekDeadlines = deadlines.filter(d => !d.trashedAt && isThisWeekDate(d.date));

  const handleStatusChange = (id: string, status: TaskStatus) => updateTask(id, { status });
  const handleAddPriority = () => {
    if (!newPriority.trim()) return;
    addDailyPriority(today, newPriority.trim());
    setNewPriority('');
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
      <QuickCapture />

      {/* Priorities */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today's Priorities</h2>
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
          {priorities.length < 3 && (
            <div className="flex items-center gap-2 mt-2">
              <input value={newPriority} onChange={e => setNewPriority(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPriority()}
                placeholder={priorities.length === 0 ? 'Set your top priority...' : 'Add another priority...'}
                className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-amber-300 py-1 bg-transparent placeholder:text-gray-400" />
              <button onClick={handleAddPriority} className="text-amber-600 hover:text-amber-700"><Plus className="w-4 h-4" /></button>
            </div>
          )}
          {priorities.length === 0 && !newPriority && (
            <p className="text-sm text-gray-400 italic">Set your top 1-3 priorities for today</p>
          )}
        </div>
      </div>

      {/* Today */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Today</h2>
        </div>
        <div className="mt-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {todayTasks.map(({ task, labels }) => (
            <TaskRow key={task.id} task={task} labels={labels} onStatusChange={handleStatusChange} />
          ))}
          {todayTasks.length === 0 && <div className="py-6 text-center text-sm text-gray-400">No tasks for today</div>}
        </div>
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overdue</h2>
            <span className="text-xs text-red-500 font-medium">({overdueTasks.length})</span>
          </div>
          <div className="mt-2 bg-white rounded-xl border border-red-200 divide-y divide-red-50 overflow-hidden">
            {overdueTasks.map(task => {
              const labels = ['Overdue'];
              if (task.domainId) labels.push(getDomainName(task.domainId, domains));
              return <TaskRow key={task.id} task={task} labels={labels} onStatusChange={handleStatusChange} />;
            })}
          </div>
        </div>
      )}

      {/* Inbox Preview */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InboxIcon className="w-4 h-4 text-gray-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Inbox</h2>
            {inboxTotal > 0 && <span className="text-xs text-gray-400">({inboxTotal})</span>}
          </div>
          {inboxTotal > 5 && (
            <button onClick={() => navigate('inbox')} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="mt-2 space-y-1">
          {inboxItems.map(c => (
            <div key={c.id} className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-700 flex-1 truncate">{c.text}</span>
              {c.type && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 shrink-0">{CAPTURE_TYPE_LABELS[c.type]}</span>}
              <span className="text-[11px] text-gray-400 shrink-0">{formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}</span>
            </div>
          ))}
          {inboxItems.length === 0 && <p className="text-sm text-gray-400 italic py-2">Inbox is clear — capture something!</p>}
        </div>
      </div>

      {/* Recent Contexts */}
      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Contexts</h2>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentProjects.map(project => (
            <button key={project.id} onClick={() => navigate('project-detail', project.id)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${PROJECT_STATUS_CONFIG[project.status].color}`}>
                  {PROJECT_STATUS_CONFIG[project.status].label}
                </span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1.5 inline-block ${getDomainColor(project.domainId, domains)}`}>
                {getDomainName(project.domainId, domains)}
              </span>
              {project.nextAction && (
                <p className="text-xs text-gray-600 mt-2 truncate"><span className="font-medium text-indigo-600">Next:</span> {project.nextAction}</p>
              )}
              {project.latestStatus && (
                <p className="text-[11px] text-gray-400 mt-1 truncate">{project.latestStatus}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1.5">Updated {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}</p>
            </button>
          ))}
          {recentProjects.length === 0 && (
            <div className="col-span-full text-center py-6 text-sm text-gray-400">No active projects yet</div>
          )}
        </div>
      </div>

      {/* Collapsed Sections */}
      <CollapsibleSection title="This Week" count={weekDeadlines.length}>
        {weekDeadlines.length > 0 ? (
          <div className="space-y-2">{weekDeadlines.map(d => (
            <div key={d.id} className="flex items-center gap-2 text-sm py-1">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{d.title}</span>
              <span className="text-gray-400 text-xs">— {format(parseISO(d.date), 'MMM d')}</span>
            </div>
          ))}</div>
        ) : <p className="text-sm text-gray-400">No deadlines this week</p>}
      </CollapsibleSection>

      <CollapsibleSection title="Upcoming Deadlines" count={deadlines.filter(d => !d.trashedAt).length}>
        {deadlines.filter(d => !d.trashedAt).slice(0, 5).map(d => (
          <div key={d.id} className="flex items-center gap-2 text-sm py-1">
            <span className="text-gray-700">{d.title}</span>
            <span className="text-gray-400 text-xs">— {format(parseISO(d.date), 'MMM d, yyyy')}</span>
          </div>
        ))}
        {deadlines.filter(d => !d.trashedAt).length === 0 && <p className="text-sm text-gray-400">No deadlines</p>}
      </CollapsibleSection>

      <CollapsibleSection title="Agent Suggestions">
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-700">Suggestions</span>
          </div>
          <ul className="space-y-2 text-sm text-indigo-800">
            {overdueTasks.length > 0 && <li>• You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}. Consider rescheduling or completing them.</li>}
            {inboxTotal > 5 && <li>• Your inbox has {inboxTotal} unprocessed items. Time for a quick triage?</li>}
            {recentProjects.filter(p => !p.nextAction).length > 0 && <li>• {recentProjects.filter(p => !p.nextAction).length} project(s) without a next action. Define one to maintain momentum.</li>}
            {overdueTasks.length === 0 && inboxTotal <= 5 && <li>• Everything looks good! Consider setting priorities for today.</li>}
          </ul>
        </div>
      </CollapsibleSection>
    </div>
  );
}
