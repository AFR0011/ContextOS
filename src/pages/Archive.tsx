import { useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Archive as ArchiveIcon, Trash2, RotateCcw, FolderKanban, CheckSquare } from 'lucide-react';
import { useStore } from '../store';
import { EmptyState } from '../components/Shared';
import { getDomainName } from '../utils/helpers';
import { useState } from 'react';

export default function ArchivePage() {
  const { projects, tasks, domains, archiveProject, restoreProject, restoreTask, navigate } = useStore();
  const [tab, setTab] = useState<'archived' | 'trash'>('archived');

  const archivedProjects = useMemo(() => projects.filter(p => p.status === 'archived' && !p.trashedAt), [projects]);
  const trashedItems = useMemo(() => {
    const items: { id: string; type: string; title: string; trashedAt: string; onRestore: () => void }[] = [];
    projects.filter(p => p.trashedAt).forEach(p => items.push({ id: p.id, type: 'Project', title: p.name, trashedAt: p.trashedAt!, onRestore: () => restoreProject(p.id) }));
    tasks.filter(t => t.trashedAt).forEach(t => items.push({ id: t.id, type: 'Task', title: t.title, trashedAt: t.trashedAt!, onRestore: () => restoreTask(t.id) }));
    return items.sort((a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime());
  }, [projects, tasks, restoreProject, restoreTask]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Archive</h1>
      <p className="mt-1 text-sm text-gray-500">Archived and deleted items</p>

      <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setTab('archived')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Archived ({archivedProjects.length})
        </button>
        <button onClick={() => setTab('trash')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'trash' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Trash ({trashedItems.length})
        </button>
      </div>

      {tab === 'archived' && (
        <div className="mt-4 space-y-2">
          {archivedProjects.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <FolderKanban className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{p.name}</p>
                <p className="text-xs text-gray-400">{getDomainName(p.domainId, domains)}</p>
              </div>
              <button onClick={() => navigate('project-detail', p.id)} className="text-xs text-indigo-600 hover:text-indigo-700">View</button>
              <button onClick={() => archiveProject(p.id)} className="text-xs text-emerald-600 hover:text-emerald-700">Restore</button>
            </div>
          ))}
          {archivedProjects.length === 0 && <EmptyState icon={ArchiveIcon} title="No archived items" />}
        </div>
      )}

      {tab === 'trash' && (
        <div className="mt-4 space-y-2">
          {trashedItems.map(item => (
            <div key={`${item.type}-${item.id}`} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              {item.type === 'Project' ? <FolderKanban className="w-4 h-4 text-gray-400" /> : <CheckSquare className="w-4 h-4 text-gray-400" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{item.title}</p>
                <p className="text-xs text-gray-400">{item.type} · Deleted {formatDistanceToNow(parseISO(item.trashedAt), { addSuffix: true })}</p>
              </div>
              <button onClick={item.onRestore} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                <RotateCcw className="w-3 h-3" /> Restore
              </button>
            </div>
          ))}
          {trashedItems.length === 0 && <EmptyState icon={Trash2} title="Trash is empty" />}
        </div>
      )}
    </div>
  );
}
