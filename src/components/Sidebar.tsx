import React from 'react';
import { MessageSquare, FileText, Bell, Mic, UserCheck, Sparkles, FolderSearch } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadRemindersCount?: number;
  documentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadRemindersCount = 0,
  documentsCount = 0,
}) => {
  const navItems = [
    {
      id: 'chat',
      label: 'AI Chat',
      icon: MessageSquare,
      description: 'Conversational assistant with Gemini',
      badge: '3.6',
    },
    {
      id: 'documents',
      label: 'Document Search',
      icon: FolderSearch,
      description: 'AI semantic search & Q&A',
      count: documentsCount,
    },
    {
      id: 'reminders',
      label: 'Smart Reminders',
      icon: Bell,
      description: 'Natural language task breakdown',
      count: unreadRemindersCount,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'voice',
      label: 'Voice Dictation',
      icon: Mic,
      description: 'Speech-to-text dictation & notes',
    },
    {
      id: 'account',
      label: 'User Account',
      icon: UserCheck,
      description: 'Security, profile & preferences',
    },
  ];

  return (
    <aside className="flex flex-col border-r border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50 md:w-64">
      <div className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Workspace Modules
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-5 w-5 shrink-0 transition ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200'
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div
                    className={`hidden text-xs md:block ${
                      isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              {/* Badges / Counts */}
              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive
                      ? 'bg-white text-indigo-600'
                      : item.badgeColor || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Quick Insight Box */}
      <div className="mt-4 hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-3.5 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-slate-900 md:block">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="h-4 w-4" />
          <span>Gemini Workspace</span>
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Upload documents to chat directly with them or dictate smart reminders hands-free.
        </p>
      </div>
    </aside>
  );
};
