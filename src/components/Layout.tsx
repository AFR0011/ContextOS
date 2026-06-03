import { type ReactNode } from 'react';
import {
  LayoutDashboard, Inbox, Sun, CalendarDays,
  FolderKanban, AlertCircle, Archive, Search, BookOpen, Settings,
  Menu, X, Zap
} from 'lucide-react';
import { useStore } from '../store';
import type { ViewType } from '../types';

const NAV_ITEMS: { view: ViewType; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'inbox', label: 'Inbox', icon: Inbox },
  { view: 'today', label: 'Today', icon: Sun },
  { view: 'this-week', label: 'This Week', icon: CalendarDays },
  { view: 'projects', label: 'Projects', icon: FolderKanban },
  { view: 'deadlines', label: 'Deadlines', icon: AlertCircle },
  { view: 'archive', label: 'Archive', icon: Archive },
  { view: 'search', label: 'Search', icon: Search },
  { view: 'reviews', label: 'Reviews', icon: BookOpen },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const currentView = useStore(s => s.currentView);
  const navigate = useStore(s => s.navigate);
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const toggleSidebar = useStore(s => s.toggleSidebar);
  const captures = useStore(s => s.captures);
  const inboxCount = captures.filter(c => c.status === 'unprocessed').length;

  const handleNav = (view: ViewType) => {
    navigate(view);
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        flex flex-col shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">ContextOS</span>
          <button className="ml-auto lg:hidden p-1 hover:bg-gray-100 rounded" onClick={toggleSidebar}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.view || (item.view === 'projects' && currentView === 'project-detail');
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium
                  transition-colors duration-150 cursor-pointer
                  ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
                {item.view === 'inbox' && inboxCount > 0 && (
                  <span className="ml-auto bg-indigo-600 text-white text-[11px] font-semibold min-w-[20px] text-center px-1.5 py-0.5 rounded-full">
                    {inboxCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 font-medium">ContextOS MVP v1.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">
              {NAV_ITEMS.find(n => n.view === currentView || (n.view === 'projects' && currentView === 'project-detail'))?.label || 'ContextOS'}
            </span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
