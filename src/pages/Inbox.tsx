import { useState, useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Inbox, Trash2, Archive, MoreHorizontal } from 'lucide-react';
import { useStore } from '../store';
import QuickCapture from '../components/QuickCapture';
import { EmptyState } from '../components/Shared';
import { CAPTURE_TYPE_LABELS } from '../utils/helpers';

type FilterTab = 'all' | 'unprocessed' | 'converted' | 'archived';

export default function InboxPage() {
  const { captures, convertCaptureToTask, convertCaptureToProject, convertCaptureToNote, convertCaptureToDeadline, archiveCapture, deleteCapture } = useStore();
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = useMemo(() => captures.filter(c => {
    if (c.status === 'deleted') return false;
    switch (filter) {
      case 'unprocessed': return c.status === 'unprocessed';
      case 'converted': return c.status === 'converted';
      case 'archived': return c.status === 'archived';
      default: return true;
    }
  }), [captures, filter]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'unprocessed', label: 'Unprocessed' },
    { key: 'converted', label: 'Converted' }, { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
      <p className="mt-1 text-sm text-gray-500">Capture and triage your thoughts</p>
      <div className="mt-4"><QuickCapture /></div>
      <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {filtered.map(capture => (
          <CaptureCard key={capture.id} capture={capture}
            onConvertToTask={() => convertCaptureToTask(capture.id)}
            onConvertToProject={() => convertCaptureToProject(capture.id)}
            onConvertToNote={() => convertCaptureToNote(capture.id)}
            onConvertToDeadline={() => convertCaptureToDeadline(capture.id)}
            onArchive={() => archiveCapture(capture.id)}
            onDelete={() => deleteCapture(capture.id)} />
        ))}
        {filtered.length === 0 && (
          <EmptyState icon={Inbox} title="No items" description={filter === 'all' ? 'Capture something to get started' : `No ${filter} items`} />
        )}
      </div>
    </div>
  );
}

function CaptureCard({ capture, onConvertToTask, onConvertToProject, onConvertToNote, onConvertToDeadline, onArchive, onDelete }: {
  capture: any; onConvertToTask: () => void; onConvertToProject: () => void; onConvertToNote: () => void;
  onConvertToDeadline: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{capture.text}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {capture.type && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{CAPTURE_TYPE_LABELS[capture.type] || capture.type}</span>}
            <span className="text-[11px] text-gray-400">{formatDistanceToNow(parseISO(capture.createdAt), { addSuffix: true })}</span>
            {capture.status === 'converted' && <span className="text-[11px] text-emerald-600 font-medium">✓ Converted</span>}
          </div>
        </div>
        {capture.status === 'unprocessed' && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 shrink-0 p-1">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>
      {expanded && capture.status === 'unprocessed' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
          <button onClick={onConvertToTask} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">→ Task</button>
          <button onClick={onConvertToProject} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">→ Project</button>
          <button onClick={onConvertToNote} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">→ Note</button>
          <button onClick={onConvertToDeadline} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">→ Deadline</button>
          <div className="flex-1" />
          <button onClick={onArchive} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"><Archive className="w-3.5 h-3.5 inline mr-1" />Archive</button>
          <button onClick={onDelete} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Delete</button>
        </div>
      )}
    </div>
  );
}
