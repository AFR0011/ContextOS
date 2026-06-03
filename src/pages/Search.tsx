import { useState, useMemo } from 'react';
import { Search as SearchIcon, FolderKanban, CheckSquare, FileText, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { getDomainName, TASK_STATUS_CONFIG } from '../utils/helpers';

type FilterType = 'all' | 'projects' | 'tasks' | 'notes' | 'deadlines' | 'captures';

interface SearchResult {
  id: string; type: string; title: string; subtitle?: string; onClick: () => void;
}

export default function SearchPage() {
  const { tasks, projects, notes, deadlines, captures, domains, navigate } = useStore();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const res: SearchResult[] = [];
    if (filterType === 'all' || filterType === 'projects') {
      projects.filter(p => !p.trashedAt && (p.name.toLowerCase().includes(q) || p.currentObjective.toLowerCase().includes(q) || p.nextAction.toLowerCase().includes(q)))
        .forEach(p => res.push({ id: p.id, type: 'Project', title: p.name, subtitle: `${getDomainName(p.domainId, domains)} · ${p.status}`, onClick: () => navigate('project-detail', p.id) }));
    }
    if (filterType === 'all' || filterType === 'tasks') {
      tasks.filter(t => !t.trashedAt && t.title.toLowerCase().includes(q))
        .forEach(t => { const pn = t.projectId ? projects.find(p => p.id === t.projectId)?.name : ''; res.push({ id: t.id, type: 'Task', title: t.title, subtitle: `${TASK_STATUS_CONFIG[t.status].label}${pn ? ' · ' + pn : ''}`, onClick: () => {} }); });
    }
    if (filterType === 'all' || filterType === 'notes') {
      notes.filter(n => !n.trashedAt && (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)))
        .forEach(n => res.push({ id: n.id, type: 'Note', title: n.title, subtitle: n.content.slice(0, 60), onClick: () => {} }));
    }
    if (filterType === 'all' || filterType === 'deadlines') {
      deadlines.filter(d => !d.trashedAt && d.title.toLowerCase().includes(q))
        .forEach(d => res.push({ id: d.id, type: 'Deadline', title: d.title, subtitle: d.date, onClick: () => {} }));
    }
    if (filterType === 'all' || filterType === 'captures') {
      captures.filter(c => c.status !== 'deleted' && c.text.toLowerCase().includes(q))
        .forEach(c => res.push({ id: c.id, type: 'Capture', title: c.text, onClick: () => navigate('inbox') }));
    }
    return res.slice(0, 50);
  }, [query, filterType, tasks, projects, notes, deadlines, captures, domains, navigate]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Search</h1>
      <p className="mt-1 text-sm text-gray-500">Find anything across your workspace</p>
      <div className="mt-4 relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects, tasks, notes..." autoFocus
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        {(['all', 'projects', 'tasks', 'notes', 'deadlines', 'captures'] as FilterType[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${filterType === t ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
        ))}
      </div>
      <div className="mt-4 space-y-1">
        {results.map(r => (
          <button key={`${r.type}-${r.id}`} onClick={r.onClick}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors">
            <TypeIcon type={r.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{r.title}</p>
              {r.subtitle && <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>}
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{r.type}</span>
          </button>
        ))}
        {query.trim() && results.length === 0 && (
          <div className="text-center py-12 text-gray-400"><SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-50" /><p className="text-sm">No results for "{query}"</p></div>
        )}
        {!query.trim() && <div className="text-center py-12 text-gray-400"><p className="text-sm">Start typing to search...</p></div>}
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const cfg: Record<string, { icon: typeof SearchIcon; color: string }> = {
    Project: { icon: FolderKanban, color: 'text-emerald-500' },
    Task: { icon: CheckSquare, color: 'text-blue-500' },
    Note: { icon: FileText, color: 'text-purple-500' },
    Deadline: { icon: AlertCircle, color: 'text-amber-500' },
    Capture: { icon: SearchIcon, color: 'text-gray-500' },
  };
  const c = cfg[type] || cfg.Capture;
  const Icon = c.icon;
  return <Icon className={`w-4 h-4 shrink-0 ${c.color}`} />;
}
