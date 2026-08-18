import React, { useState } from 'react';
import { Reminder, PriorityLevel, ReminderCategory } from '../types';
import { Bell, Plus, Sparkles, CheckSquare, Square, Calendar, Clock, Tag, AlertTriangle, Trash2, CheckCircle2, Mic, ListChecks, ChevronRight, Filter } from 'lucide-react';

interface SmartRemindersProps {
  authToken: string;
  reminders: Reminder[];
  onAddReminder: (reminder: Reminder) => void;
  onUpdateReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  isVoiceListening: boolean;
  onToggleVoice: () => void;
  voiceText: string;
}

export const SmartReminders: React.FC<SmartRemindersProps> = ({
  reminders,
  authToken,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  isVoiceListening,
  onToggleVoice,
  voiceText,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [parsingAi, setParsingAi] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Sync voice input
  React.useEffect(() => {
    if (voiceText) {
      setPromptInput((prev) => (prev ? `${prev} ${voiceText}` : voiceText));
    }
  }, [voiceText]);

  const handleParseAiReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setParsingAi(true);
    try {
      const res = await fetch('/api/reminders/parse-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ prompt: promptInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse reminder');

      onAddReminder(data.reminder);
      setPromptInput('');
    } catch (err: any) {
      alert(`AI Reminder error: ${err.message}`);
    } finally {
      setParsingAi(false);
    }
  };

  const toggleReminderComplete = (reminder: Reminder) => {
    onUpdateReminder({
      ...reminder,
      isCompleted: !reminder.isCompleted,
    });
  };

  const toggleSubtask = (reminder: Reminder, subtaskId: string) => {
    const updatedSubtasks = reminder.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateReminder({
      ...reminder,
      subtasks: updatedSubtasks,
    });
  };

  const getPriorityBadgeClass = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200';
      case 'high':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200';
      case 'medium':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  // Filter logic
  const filteredReminders = reminders.filter((r) => {
    if (statusFilter === 'pending' && r.isCompleted) return false;
    if (statusFilter === 'completed' && !r.isCompleted) return false;
    if (statusFilter === 'high' && !['high', 'urgent'].includes(r.priority)) return false;

    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/40 sm:p-6">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-500" />
          <span>Smart AI Reminders & Task Breakdown</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Dictate or type natural requests. OneAI will extract due dates, categories, priorities, and step-by-step subtasks.
        </p>
      </div>

      {/* AI Smart Creator Bar */}
      <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleParseAiReminder} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500" />
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. 'Remind me tomorrow at 3pm to review Q3 roadmap and send meeting notes to team'..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="button"
              onClick={onToggleVoice}
              className={`absolute right-2.5 top-2 rounded-lg p-1 transition ${
                isVoiceListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Dictate with Voice"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={parsingAi || !promptInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{parsingAi ? 'AI Parsing...' : 'Parse & Create with AI'}</span>
          </button>
        </form>
      </div>

      {/* Filters Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          {(['all', 'pending', 'completed', 'high'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {filter === 'high' ? '🔥 High Priority' : filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="finance">Finance</option>
            <option value="learning">Learning</option>
          </select>
        </div>
      </div>

      {/* Reminders List */}
      <div className="mt-6 space-y-4">
        {filteredReminders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <Bell className="mx-auto h-10 w-10 text-slate-400" />
            <h4 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">No reminders found</h4>
            <p className="mt-1 text-xs text-slate-500">Dictate or type a reminder above to get started.</p>
          </div>
        ) : (
          filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`group relative rounded-2xl border p-4 shadow-sm transition ${
                reminder.isCompleted
                  ? 'border-slate-200 bg-slate-100/60 opacity-75 dark:border-slate-800 dark:bg-slate-900/40'
                  : 'border-slate-800 bg-slate-900 hover:border-indigo-500 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Completion Checkbox */}
                  <button
                    onClick={() => toggleReminderComplete(reminder)}
                    className="mt-0.5 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {reminder.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-400 hover:text-indigo-600" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm font-bold text-slate-900 dark:text-white ${
                          reminder.isCompleted ? 'line-through text-slate-500 dark:text-slate-500' : ''
                        }`}
                      >
                        {reminder.title}
                      </h3>

                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadgeClass(
                          reminder.priority
                        )}`}
                      >
                        {reminder.priority}
                      </span>

                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {reminder.category}
                      </span>
                    </div>

                    {reminder.description && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {reminder.description}
                      </p>
                    )}

                    {/* Subtasks Checklist */}
                    {reminder.subtasks && reminder.subtasks.length > 0 && (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-800/50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          <ListChecks className="h-4 w-4 text-indigo-500" />
                          <span>AI Breakdown Checklist ({reminder.subtasks.filter((s) => s.completed).length}/{reminder.subtasks.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {reminder.subtasks.map((st) => (
                            <button
                              key={st.id}
                              onClick={() => toggleSubtask(reminder, st.id)}
                              className="flex items-center gap-2 text-left w-full text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                            >
                              {st.completed ? (
                                <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400 shrink-0" />
                              )}
                              <span className={st.completed ? 'line-through text-slate-400' : ''}>
                                {st.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Suggested Steps */}
                    {reminder.aiSuggestedSteps && reminder.aiSuggestedSteps.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-medium">AI Tip: {reminder.aiSuggestedSteps[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Metadata & Delete */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(reminder.dueDate).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => onDeleteReminder(reminder.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition"
                    title="Delete Reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
