import React from 'react';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, Lock, Mail, Key, Sparkles, Check, X, Moon, Sun, Bell, Volume2, LogOut } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* User Card */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-md shadow-indigo-500/20">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Account ID: {user.id}</p>
          </div>
        </div>

        {/* Security & Preferences */}
        <div className="mt-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security & Encryption</h3>
          
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-500" /> Session Encryption
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">SHA-256 Active</span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-500" /> Server-side API Isolation
              </span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Isolated</span>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Workspace Preferences</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-indigo-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Auto Text-to-Speech</div>
                  <div className="text-[11px] text-slate-400">Read assistant replies aloud automatically</div>
                </div>
              </div>
              <input type="checkbox" defaultChecked={user.preferences?.autoTextToSpeech} className="h-4 w-4 accent-indigo-600" />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Smart Reminder Notifications</div>
                  <div className="text-[11px] text-slate-400">Receive alert cues for high priority tasks</div>
                </div>
              </div>
              <input type="checkbox" defaultChecked={user.preferences?.reminderNotifications} className="h-4 w-4 accent-indigo-600" />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
