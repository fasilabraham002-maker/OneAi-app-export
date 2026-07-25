import React from 'react';
import { User } from '../types';
import { Bot, Mic, MicOff, Search, User as UserIcon, ShieldCheck, Sparkles, Bell } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  isVoiceListening: boolean;
  onToggleVoice: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onGlobalSearch: (e: React.FormEvent) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenProfile,
  isVoiceListening,
  onToggleVoice,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onGlobalSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      {/* Left Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-md shadow-indigo-500/20">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Nexus AI
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3 w-3" /> v2.5
            </span>
          </div>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            Intelligent Workspace Assistant
          </p>
        </div>
      </div>

      {/* Middle Global Quick Query Bar */}
      <form onSubmit={onGlobalSearch} className="mx-4 hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Ask AI or search documents & reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={onToggleVoice}
            title={isVoiceListening ? "Stop Voice Dictation" : "Start Voice Dictation"}
            className={`absolute right-2 top-1.5 rounded-lg p-1 transition ${
              isVoiceListening
                ? "bg-red-500 text-white animate-pulse"
                : "text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {isVoiceListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* Right User & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Voice Mode Button */}
        <button
          onClick={onToggleVoice}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
            isVoiceListening
              ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 animate-pulse'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {isVoiceListening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isVoiceListening ? 'Listening...' : 'Voice Dictate'}</span>
        </button>

        {/* User Account Button */}
        {user ? (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-semibold text-white">
              {user.name.charAt(0)}
            </div>
            <span className="hidden text-xs font-semibold sm:inline">{user.name.split(' ')[0]}</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <UserIcon className="h-4 w-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
