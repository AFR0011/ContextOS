import { useState, useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Plus, ChevronLeft, ChevronDown, ChevronRight, X, Sparkles, Trash2, Archive, Download, FolderKanban } from 'lucide-react';
import { useStore } from '../store';
import { TaskRow, EmptyState } from '../components/Shared';
import { getDomainName, getDomainColor, PROJECT_STATUS_CONFIG, TASK_STATUS_CONFIG, getTodayStr } from '../utils/helpers';
import type { ProjectStatus, TaskStatus } from '../types';

function EditableField({ value, onChange, placeholder, multiline = false }: {
  value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    const Tag = multiline ? 'textarea' : 'input';
    return (
      <Tag value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={e => { if (!multiline && e.key === 'Enter') { onChange(draft); setEditing(false); } if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        autoFocus rows={multiline ? 3 : undefined}
        className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" />
    );
  }
  return (
    <div onClick={() => { setDraft(value); setEditing(true); }}
      className="cursor-pointer rounded-lg px-3 py-2 -mx-1 hover:bg-gray-50 transition-colors min-h-[36px] flex items-start whitespace-pre-wrap">
      {value ? <span>{value}</span> : <span className="text-gray-400 italic">{placeholder}</span>}
    </div>
  );
}

export default function Projects() {
  const currentView = useStore(s => s.currentView);
  const selectedProjectId = useStore(s => s.selectedProjectId);
  if (currentView === 'project-detail' && selectedProjectId) return <ProjectDetail />;
  return <ProjectList />;
}

function ProjectList() {
  const { projects, tasks, domains, navigate, addProject } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState(domains.find(d => !d.archived)?.id || '');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const activeDomains = domains.filter(d => !d.archived);

  const filtered = useMemo(() => projects.filter(p => {
    if (p.trashedAt) return false;
    if (filterDomain !== 'all' && p.domainId !== filterDomain) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  }), [projects, filterDomain, filterStatus]);

  const handleCreate = () => { if (!newName.trim()) return; addProject({ name: newName.trim(), domainId: newDomain }); setNewName(''); setShowNew(false); };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Projects</h1><p className="mt-1 text-sm text-gray-500">Track outcomes and next actions</p></div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showNew && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Project name..." autoFocus className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
          <div className="flex items-center gap-3 mt-3">
            <select value={newDomain} onChange={e => setNewDomain(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none">
              {activeDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button onClick={handleCreate} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Create</button>
            <button onClick={() => { setShowNew(false); setNewName(''); }} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4 flex-wrap">
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none">
          <option value="all">All Domains</option>
          {activeDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none">
          <option value="all">All Statuses</option>
          <option value="active">Active</option><option value="paused">Paused</option>
          <option value="done">Done</option><option value="archived">Archived</option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(project => {
          const tc = tasks.filter(t => t.projectId === project.id && !t.trashedAt && t.status !== 'done' && t.status !== 'dropped').length;
          return (
            <button key={project.id} onClick={() => navigate('project-detail', project.id)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{project.name}</h3>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${PROJECT_STATUS_CONFIG[project.status].color}`}>{PROJECT_STATUS_CONFIG[project.status].label}</span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-2 inline-block ${getDomainColor(project.domainId, domains)}`}>{getDomainName(project.domainId, domains)}</span>
              {project.currentObjective && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{project.currentObjective}</p>}
              {project.nextAction && <p className="text-xs text-indigo-600 font-medium mt-1.5 truncate">→ {project.nextAction}</p>}
              {tc > 0 && <p className="text-[11px] text-gray-400 mt-2">{tc} open task{tc > 1 ? 's' : ''}</p>}
            </button>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full"><EmptyState icon={FolderKanban} title="No projects" description="Create a project to start tracking outcomes" /></div>}
      </div>
    </div>
  );
}

function ProjectDetail() {
  const { selectedProjectId, projects, tasks, domains, deadlines, notes, navigate,
    updateProject, addTask, updateTask, addNote, updateNote, deleteNote,
    addDeadline, deleteDeadline, archiveProject, trashProject, restoreProject } = useStore();
  const project = projects.find(p => p.id === selectedProjectId);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newLoop, setNewLoop] = useState('');
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState(getTodayStr());
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);

  if (!project) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <button onClick={() => navigate('projects')} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mb-4"><ChevronLeft className="w-4 h-4" />Back to Projects</button>
      <p className="text-gray-500">Project not found</p>
    </div>
  );

  const projectTasks = tasks.filter(t => t.projectId === project.id && !t.trashedAt);
  const projectDeadlines = deadlines.filter(d => d.projectId === project.id && !d.trashedAt);
  const projectNotes = notes.filter(n => n.projectId === project.id && !n.trashedAt);
  const activeTasks = projectTasks.filter(t => t.status !== 'done' && t.status !== 'dropped');
  const activeDomains = domains.filter(d => !d.archived);
  const handleStatusChange = (id: string, status: TaskStatus) => updateTask(id, { status });

  const handleExport = () => {
    let md = `# ${project.name}\n\n**Status:** ${project.status}\n**Domain:** ${getDomainName(project.domainId, domains)}\n\n`;
    if (project.currentObjective) md += `## Current Objective\n${project.currentObjective}\n\n`;
    if (project.nextAction) md += `## Next Action\n${project.nextAction}\n\n`;
    if (project.latestStatus) md += `## Latest Status\n${project.latestStatus}\n\n`;
    if (project.openLoops.length) { md += `## Open Loops\n`; project.openLoops.forEach(l => md += `- ${l}\n`); md += '\n'; }
    if (projectDeadlines.length) { md += `## Deadlines\n`; projectDeadlines.forEach(d => md += `- ${d.title} (${d.date})\n`); md += '\n'; }
    if (projectTasks.length) { md += `## Tasks\n`; projectTasks.forEach(t => md += `- [${t.status === 'done' ? 'x' : ' '}] ${t.title}\n`); md += '\n'; }
    if (projectNotes.length) { md += `## Notes\n`; projectNotes.forEach(n => md += `### ${n.title}\n${n.content}\n\n`); }
    const blob = new Blob([md], { type: 'text/markdown' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`; a.click(); URL.revokeObjectURL(url);
  };

  const agentSuggestions: string[] = [];
  if (!project.nextAction) agentSuggestions.push('Define a next action to maintain momentum.');
  if (!project.latestStatus) agentSuggestions.push('Add a latest status to help future context recovery.');
  if (project.openLoops.length > 0) agentSuggestions.push(`You have ${project.openLoops.length} open loop(s). Consider resolving them.`);
  if (activeTasks.length === 0) agentSuggestions.push('No active tasks. Consider adding tasks to break down the work.');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <button onClick={() => navigate('projects')} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mb-4"><ChevronLeft className="w-4 h-4" />Back to Projects</button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <EditableField value={project.name} onChange={v => updateProject(project.id, { name: v })} placeholder="Project name" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select value={project.status} onChange={e => updateProject(project.id, { status: e.target.value as ProjectStatus })}
              className={`text-xs font-medium px-3 py-1 rounded-full border-0 cursor-pointer ${PROJECT_STATUS_CONFIG[project.status].color}`}>
              {Object.entries(PROJECT_STATUS_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <select value={project.domainId} onChange={e => updateProject(project.id, { domainId: e.target.value })}
            className={`text-[11px] font-medium px-2 py-0.5 rounded border-0 cursor-pointer ${getDomainColor(project.domainId, domains)}`}>
            {activeDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <span className="text-[11px] text-gray-400">Created {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Objective + Next Action + Status */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Current Objective</h3>
          <EditableField value={project.currentObjective} onChange={v => updateProject(project.id, { currentObjective: v })} placeholder="What is this project trying to achieve?" multiline />
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">⚡ Next Action</h3>
          <EditableField value={project.nextAction} onChange={v => updateProject(project.id, { nextAction: v })} placeholder="What is the very next thing to do?" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Latest Status</h3>
          <EditableField value={project.latestStatus} onChange={v => updateProject(project.id, { latestStatus: v })} placeholder="Where did you leave off?" multiline />
        </div>
      </div>

      {/* Open Loops */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Open Loops / Blockers</h3>
        {project.openLoops.map((loop, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 group">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-sm text-gray-700 flex-1">{loop}</span>
            <button onClick={() => updateProject(project.id, { openLoops: project.openLoops.filter((_, j) => j !== i) })}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
          <input value={newLoop} onChange={e => setNewLoop(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newLoop.trim()) { updateProject(project.id, { openLoops: [...project.openLoops, newLoop.trim()] }); setNewLoop(''); } }}
            placeholder="Add open loop or blocker..." className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-indigo-300 py-1 bg-transparent placeholder:text-gray-400" />
          <button onClick={() => { if (newLoop.trim()) { updateProject(project.id, { openLoops: [...project.openLoops, newLoop.trim()] }); setNewLoop(''); } }}
            className="text-indigo-600 hover:text-indigo-700"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Deadlines */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Deadlines</h3>
        {projectDeadlines.map(d => (
          <div key={d.id} className="flex items-center gap-2 py-1.5 group">
            <span className="text-sm text-gray-700 flex-1">{d.title}</span>
            <span className="text-xs text-gray-400">{d.date}</span>
            <button onClick={() => deleteDeadline(d.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
          <input value={newDeadlineTitle} onChange={e => setNewDeadlineTitle(e.target.value)} placeholder="Deadline title..."
            className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-indigo-300 py-1 bg-transparent placeholder:text-gray-400" />
          <input type="date" value={newDeadlineDate} onChange={e => setNewDeadlineDate(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 outline-none" />
          <button onClick={() => { if (newDeadlineTitle.trim()) { addDeadline({ title: newDeadlineTitle.trim(), date: newDeadlineDate, projectId: project.id }); setNewDeadlineTitle(''); } }}
            className="text-indigo-600 hover:text-indigo-700"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Tasks (collapsed) */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setTasksOpen(!tasksOpen)} className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 transition-colors">
          {tasksOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Tasks</h3>
          <span className="text-xs text-gray-400">({activeTasks.length})</span>
        </button>
        {tasksOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="divide-y divide-gray-100">
              {projectTasks.map(t => <TaskRow key={t.id} task={t} labels={[TASK_STATUS_CONFIG[t.status].label]} onStatusChange={handleStatusChange} />)}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) { addTask({ title: newTaskTitle.trim(), projectId: project.id }); setNewTaskTitle(''); } }}
                placeholder="Add a task..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
              <button onClick={() => { if (newTaskTitle.trim()) { addTask({ title: newTaskTitle.trim(), projectId: project.id }); setNewTaskTitle(''); } }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-2">Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Notes / Decisions</h3>
        {projectNotes.map(note => (
          <div key={note.id} className="border border-gray-100 rounded-lg p-3 mb-2">
            {editingNote === note.id ? (
              <div>
                <input value={note.title} onChange={e => updateNote(note.id, { title: e.target.value })}
                  className="w-full text-sm font-semibold border-b border-gray-200 pb-1 mb-2 outline-none" />
                <textarea value={note.content} onChange={e => updateNote(note.id, { content: e.target.value })}
                  rows={4} placeholder="Write in markdown..." className="w-full text-sm outline-none resize-y min-h-[80px]" />
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setEditingNote(null)} className="text-xs font-medium text-indigo-600">Done</button>
                  <button onClick={() => { deleteNote(note.id); setEditingNote(null); }} className="text-xs text-red-500">Delete</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingNote(note.id)} className="cursor-pointer hover:bg-gray-50 rounded p-1 -m-1">
                <h4 className="text-sm font-semibold text-gray-900">{note.title}</h4>
                {note.content && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{note.content}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true })}</p>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
          <input value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newNoteTitle.trim()) { const id = addNote({ title: newNoteTitle.trim(), content: '', projectId: project.id, domainId: project.domainId }); setNewNoteTitle(''); setEditingNote(id); } }}
            placeholder="Add a note..." className="flex-1 text-sm border-b border-gray-200 outline-none focus:border-indigo-300 py-1 bg-transparent placeholder:text-gray-400" />
          <button onClick={() => { if (newNoteTitle.trim()) { const id = addNote({ title: newNoteTitle.trim(), content: '', projectId: project.id, domainId: project.domainId }); setNewNoteTitle(''); setEditingNote(id); } }}
            className="text-indigo-600 hover:text-indigo-700"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Agent Suggestions */}
      {agentSuggestions.length > 0 && (
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-indigo-500" /><h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Agent Suggestions</h3></div>
          <ul className="space-y-1.5">{agentSuggestions.map((s, i) => <li key={i} className="text-sm text-indigo-800">• {s}</li>)}</ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <button onClick={handleExport} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Download className="w-4 h-4" /> Export Markdown
        </button>
        <button onClick={() => archiveProject(project.id)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Archive className="w-4 h-4" /> {project.status === 'archived' ? 'Unarchive' : 'Archive'}
        </button>
        {project.trashedAt ? (
          <button onClick={() => restoreProject(project.id)} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors">Restore</button>
        ) : (
          <button onClick={() => { trashProject(project.id); navigate('projects'); }} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
