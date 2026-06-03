import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, AlertCircle, Calendar, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { EmptyState } from '../components/Shared';
import { getProjectName, getTodayStr, isThisWeekDate, isTodayDate } from '../utils/helpers';

export default function DeadlinesPage() {
  const { deadlines, projects, addDeadline, updateDeadline, deleteDeadline, navigate } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'done'>('all');

  const activeDeadlines = useMemo(() => deadlines.filter(d => !d.trashedAt), [deadlines]);
  const today = getTodayStr();

  const grouped = useMemo(() => {
    const overdue = activeDeadlines.filter(d => d.date < today);
    const thisWeek = activeDeadlines.filter(d => !isTodayDate(d.date) && d.date >= today && isThisWeekDate(d.date));
    const later = activeDeadlines.filter(d => d.date >= today && !isThisWeekDate(d.date));
    return { overdue, thisWeek, later };
  }, [activeDeadlines, today]);

  const display = useMemo(() => {
    switch (filter) {
      case 'overdue': return grouped.overdue;
      case 'upcoming': return [...grouped.thisWeek, ...grouped.later];
      default: return [...grouped.overdue, ...grouped.thisWeek, ...grouped.later];
    }
  }, [filter, grouped]);

  const handleAdd = () => {
    if (!title.trim()) return;
    addDeadline({ title: title.trim(), date, projectId: projectId || undefined, notes: notes.trim() || undefined });
    setTitle(''); setDate(getTodayStr()); setProjectId(''); setNotes(''); setShowAdd(false);
  };

  const activeProjects = projects.filter(p => !p.trashedAt && p.status !== 'archived');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Deadlines</h1><p className="mt-1 text-sm text-gray-500">Track important dates</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Deadline
        </button>
      </div>

      {showAdd && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Deadline title..." autoFocus
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none" />
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
              <option value="">No project</option>
              {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none mt-3 resize-none" />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleAdd} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Add</button>
            <button onClick={() => { setShowAdd(false); setTitle(''); }} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
        {(['all', 'upcoming', 'overdue'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}{f === 'overdue' && grouped.overdue.length > 0 ? ` (${grouped.overdue.length})` : ''}
          </button>
        ))}
      </div>

      {grouped.overdue.length > 0 && filter !== 'upcoming' && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Overdue
          </h2>
          <div className="space-y-2">
            {grouped.overdue.map(d => <DeadlineCard key={d.id} deadline={d} projects={projects} onDelete={() => deleteDeadline(d.id)} onEdit={(u: any) => updateDeadline(d.id, u)} navigate={navigate} />)}
          </div>
        </div>
      )}

      {grouped.thisWeek.length > 0 && filter !== 'overdue' && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">This Week</h2>
          <div className="space-y-2">
            {grouped.thisWeek.map(d => <DeadlineCard key={d.id} deadline={d} projects={projects} onDelete={() => deleteDeadline(d.id)} onEdit={(u: any) => updateDeadline(d.id, u)} navigate={navigate} />)}
          </div>
        </div>
      )}

      {grouped.later.length > 0 && filter !== 'overdue' && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Later</h2>
          <div className="space-y-2">
            {grouped.later.map(d => <DeadlineCard key={d.id} deadline={d} projects={projects} onDelete={() => deleteDeadline(d.id)} onEdit={(u: any) => updateDeadline(d.id, u)} navigate={navigate} />)}
          </div>
        </div>
      )}

      {display.length === 0 && <div className="mt-4"><EmptyState icon={Calendar} title="No deadlines" description="Add a deadline to track important dates" /></div>}
    </div>
  );
}

function DeadlineCard({ deadline, projects, onDelete, onEdit, navigate }: any) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(deadline.title);
  const [date, setDate] = useState(deadline.date);
  const pName = deadline.projectId ? getProjectName(deadline.projectId, projects) : '';

  if (editing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2 py-1 outline-none mb-2" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 outline-none" />
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => { onEdit({ title, date }); setEditing(false); }} className="text-xs font-medium text-indigo-600">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-500">Cancel</button>
        </div>
      </div>
    );
  }

  const isOverdue = deadline.date < new Date().toISOString().split('T')[0];
  return (
    <div className={`bg-white border rounded-lg p-3 flex items-center gap-3 group ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      <Calendar className={`w-4 h-4 shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>{deadline.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>{format(parseISO(deadline.date), 'MMM d, yyyy')}</span>
          {pName && <button onClick={() => navigate('project-detail', deadline.projectId)} className="text-xs text-indigo-600 hover:text-indigo-700">{pName}</button>}
        </div>
      </div>
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity text-xs">Edit</button>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}
