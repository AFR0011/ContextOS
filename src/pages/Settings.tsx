import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../store';
import { DOMAIN_COLORS } from '../utils/helpers';

export default function SettingsPage() {
  const { domains, addDomain, updateDomain, archiveDomain } = useStore();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const activeDomains = domains.filter(d => !d.archived);
  const archivedDomains = domains.filter(d => d.archived);

  const handleAdd = () => { if (!newName.trim()) return; addDomain(newName.trim()); setNewName(''); };
  const handleRename = (id: string) => { if (!editName.trim()) return; updateDomain(id, { name: editName.trim() }); setEditId(null); setEditName(''); };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your workspace</p>

      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Domains</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {activeDomains.map(domain => {
            const color = DOMAIN_COLORS[domain.id] || 'bg-gray-100 text-gray-800';
            return (
              <div key={domain.id} className="flex items-center gap-3 px-4 py-3 group">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${color}`}>{domain.name}</span>
                <div className="flex-1" />
                {editId === domain.id ? (
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(domain.id); if (e.key === 'Escape') setEditId(null); }}
                      autoFocus className="text-sm border border-gray-200 rounded px-2 py-1 outline-none w-36" />
                    <button onClick={() => handleRename(domain.id)} className="text-xs text-indigo-600 font-medium">Save</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-500">Cancel</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setEditId(domain.id); setEditName(domain.name); }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-gray-700 transition-opacity">Rename</button>
                    <button onClick={() => archiveDomain(domain.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-red-500 transition-opacity">Archive</button>
                  </>
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-4 py-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add domain..." className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400" />
            <button onClick={handleAdd} className="text-indigo-600 hover:text-indigo-700"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {archivedDomains.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Archived Domains</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {archivedDomains.map(domain => (
              <div key={domain.id} className="flex items-center gap-3 px-4 py-3 group">
                <span className="text-sm text-gray-400 line-through">{domain.name}</span>
                <div className="flex-1" />
                <button onClick={() => archiveDomain(domain.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-emerald-600 hover:text-emerald-700 transition-opacity">Restore</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">About ContextOS</h3>
        <p className="text-xs text-gray-500 mt-1">ContextOS MVP v1.0 — An execution-first context recovery system.</p>
        <p className="text-xs text-gray-400 mt-1">All data is stored locally in your browser using localStorage.</p>
      </div>
    </div>
  );
}
