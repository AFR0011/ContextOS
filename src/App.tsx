import { useMemo, useState } from 'react';

type View = 'dashboard' | 'inbox' | 'today' | 'week' | 'projects' | 'deadlines' | 'reviews' | 'archive';
type TaskStatus = 'next' | 'doing' | 'blocked' | 'done';

type Capture = { id: string; text: string; createdAt: string; converted: boolean };
type Task = { id: string; title: string; status: TaskStatus; due?: string; project?: string };
type Project = { id: string; title: string; objective: string; nextAction: string; status: 'active' | 'paused' | 'done' };

type Deadline = { id: string; title: string; date: string; linked?: string };

const initialProjects: Project[] = [
  {
    id: 'ctx',
    title: 'ContextOS MVP',
    objective: 'Ship a usable capture-first context dashboard.',
    nextAction: 'Validate the core loop: capture → clarify → act → review.',
    status: 'active'
  },
  {
    id: 'research',
    title: 'Research Workbench',
    objective: 'Keep thesis, papers, experiments, and handoffs from turning into swamp water.',
    nextAction: 'Define the next verifiable experiment packet.',
    status: 'active'
  }
];

const initialTasks: Task[] = [
  { id: 't1', title: 'Process inbox captures', status: 'next', project: 'ContextOS MVP' },
  { id: 't2', title: 'Write one clean project status note', status: 'doing', project: 'ContextOS MVP' },
  { id: 't3', title: 'Review deadlines and identify risk points', status: 'next' }
];

const initialDeadlines: Deadline[] = [
  { id: 'd1', title: 'MVP verification pass', date: '2026-06-07', linked: 'ContextOS MVP' },
  { id: 'd2', title: 'Weekly review', date: '2026-06-08' }
];

const nav: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'projects', label: 'Projects' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'archive', label: 'Archive' }
];

const uid = () => Math.random().toString(36).slice(2, 10);

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [captureText, setCaptureText] = useState('');
  const [captures, setCaptures] = useState<Capture[]>([
    { id: 'c1', text: '/task Clean up deployment checklist', createdAt: new Date().toISOString(), converted: false }
  ]);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [deadlines] = useState<Deadline[]>(initialDeadlines);

  const openCaptures = captures.filter(c => !c.converted);
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const stats = useMemo(() => [
    { label: 'Open captures', value: openCaptures.length },
    { label: 'Active tasks', value: activeTasks.length },
    { label: 'Active projects', value: projects.filter(p => p.status === 'active').length },
    { label: 'Deadlines', value: deadlines.length }
  ], [openCaptures.length, activeTasks.length, projects, deadlines]);

  function addCapture() {
    const text = captureText.trim();
    if (!text) return;
    setCaptures([{ id: uid(), text, createdAt: new Date().toISOString(), converted: false }, ...captures]);
    setCaptureText('');
  }

  function convertCapture(capture: Capture) {
    const title = capture.text.replace(/^\/(task|note|project|deadline|status)\s+/i, '').trim() || capture.text;
    setTasks([{ id: uid(), title, status: 'next' }, ...tasks]);
    setCaptures(captures.map(c => c.id === capture.id ? { ...c, converted: true } : c));
  }

  function cycleTask(id: string) {
    const order: TaskStatus[] = ['next', 'doing', 'blocked', 'done'];
    setTasks(tasks.map(task => {
      if (task.id !== id) return task;
      const next = order[(order.indexOf(task.status) + 1) % order.length];
      return { ...task, status: next };
    }));
  }

  function addProject() {
    const number = projects.length + 1;
    setProjects([
      {
        id: uid(),
        title: `New Project ${number}`,
        objective: 'Define the outcome before pretending motion equals progress.',
        nextAction: 'Write a concrete next action.',
        status: 'active'
      },
      ...projects
    ]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <h1>ContextOS</h1>
            <p>Context recovery system</p>
          </div>
        </div>
        <nav>
          {nav.map(item => (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
              {item.label}
              {item.id === 'inbox' && openCaptures.length > 0 ? <span>{openCaptures.length}</span> : null}
            </button>
          ))}
        </nav>
        <footer>MVP v0.1</footer>
      </aside>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Capture first. Clarify later. Very radical, apparently.</p>
            <h2>{titleFor(view)}</h2>
          </div>
          <div className="capture-bar">
            <input
              value={captureText}
              onChange={event => setCaptureText(event.target.value)}
              onKeyDown={event => event.key === 'Enter' ? addCapture() : undefined}
              placeholder="Quick capture... try /task, /note, /project"
            />
            <button onClick={addCapture}>Capture</button>
          </div>
        </section>

        {view === 'dashboard' && <Dashboard stats={stats} tasks={activeTasks} projects={projects} deadlines={deadlines} />}
        {view === 'inbox' && <Inbox captures={openCaptures} onConvert={convertCapture} />}
        {view === 'today' && <Today tasks={activeTasks} onCycle={cycleTask} />}
        {view === 'week' && <ThisWeek tasks={activeTasks} deadlines={deadlines} />}
        {view === 'projects' && <Projects projects={projects} onAdd={addProject} />}
        {view === 'deadlines' && <Deadlines deadlines={deadlines} />}
        {view === 'reviews' && <Reviews done={doneTasks.length} open={activeTasks.length} />}
        {view === 'archive' && <Archive doneTasks={doneTasks} />}
      </main>
    </div>
  );
}

function Dashboard({ stats, tasks, projects, deadlines }: { stats: { label: string; value: number }[]; tasks: Task[]; projects: Project[]; deadlines: Deadline[] }) {
  return <div className="grid-layout">
    <div className="stat-grid">{stats.map(stat => <article className="stat" key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div>
    <Panel title="Next actions"><TaskList tasks={tasks.slice(0, 5)} /></Panel>
    <Panel title="Active projects">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</Panel>
    <Panel title="Upcoming deadlines"><DeadlineList deadlines={deadlines} /></Panel>
  </div>;
}

function Inbox({ captures, onConvert }: { captures: Capture[]; onConvert: (capture: Capture) => void }) {
  if (!captures.length) return <Empty title="Inbox clear" body="Suspicious, but acceptable." />;
  return <Panel title="Unprocessed captures">{captures.map(c => <div className="row" key={c.id}><div><strong>{c.text}</strong><small>{new Date(c.createdAt).toLocaleString()}</small></div><button onClick={() => onConvert(c)}>Make task</button></div>)}</Panel>;
}

function Today({ tasks, onCycle }: { tasks: Task[]; onCycle: (id: string) => void }) {
  return <Panel title="Today"><p className="muted">Pick fewer things. Finish them. Humanity survives another day.</p><TaskList tasks={tasks} onCycle={onCycle} /></Panel>;
}

function ThisWeek({ tasks, deadlines }: { tasks: Task[]; deadlines: Deadline[] }) {
  return <div className="grid-layout two"><Panel title="Weekly priorities"><TaskList tasks={tasks.slice(0, 6)} /></Panel><Panel title="Deadline radar"><DeadlineList deadlines={deadlines} /></Panel></div>;
}

function Projects({ projects, onAdd }: { projects: Project[]; onAdd: () => void }) {
  return <Panel title="Projects" action={<button onClick={onAdd}>Add project</button>}>{projects.map(p => <ProjectCard key={p.id} project={p} />)}</Panel>;
}

function Deadlines({ deadlines }: { deadlines: Deadline[] }) {
  return <Panel title="Deadlines"><DeadlineList deadlines={deadlines} /></Panel>;
}

function Reviews({ done, open }: { done: number; open: number }) {
  return <Panel title="Review"><div className="review-card"><h3>Shutdown prompt</h3><p>What changed, what is still open, and what is the next honest action?</p><div className="review-stats"><span>{open} open</span><span>{done} done</span></div></div></Panel>;
}

function Archive({ doneTasks }: { doneTasks: Task[] }) {
  return <Panel title="Archive">{doneTasks.length ? <TaskList tasks={doneTasks} /> : <Empty title="Nothing archived yet" body="No corpses of completed tasks. Tragic." />}</Panel>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><header><h3>{title}</h3>{action}</header>{children}</section>;
}

function TaskList({ tasks, onCycle }: { tasks: Task[]; onCycle?: (id: string) => void }) {
  if (!tasks.length) return <p className="muted">No tasks here.</p>;
  return <div className="list">{tasks.map(task => <div className="task" key={task.id}><button onClick={() => onCycle?.(task.id)}>{task.status}</button><div><strong>{task.title}</strong>{task.project ? <small>{task.project}</small> : null}</div></div>)}</div>;
}

function ProjectCard({ project }: { project: Project }) {
  return <article className="project-card"><div><span>{project.status}</span><h4>{project.title}</h4></div><p>{project.objective}</p><small>Next: {project.nextAction}</small></article>;
}

function DeadlineList({ deadlines }: { deadlines: Deadline[] }) {
  return <div className="list">{deadlines.map(d => <div className="deadline" key={d.id}><strong>{d.date}</strong><div>{d.title}{d.linked ? <small>{d.linked}</small> : null}</div></div>)}</div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="empty"><h3>{title}</h3><p>{body}</p></div>;
}

function titleFor(view: View) {
  const titles: Record<View, string> = {
    dashboard: 'Dashboard',
    inbox: 'Inbox',
    today: 'Today',
    week: 'This Week',
    projects: 'Projects',
    deadlines: 'Deadlines',
    reviews: 'Reviews',
    archive: 'Archive'
  };
  return titles[view];
}

export default App;
