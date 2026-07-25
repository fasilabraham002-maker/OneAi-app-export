import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Send, Copy, Check, Radio, FileText, Bell, MessageSquare } from 'lucide-react';

interface VoiceControllerProps {
  isListening: boolean;
  onToggleListen: () => void;
  voiceText: string;
  onSendToChat: (text: string) => void;
  onSendToReminder: (text: string) => void;
  onSendToSearch: (text: string) => void;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  isListening,
  onToggleListen,
  voiceText,
  onSendToChat,
  onSendToReminder,
  onSendToSearch,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!voiceText) return;
    navigator.clipboard.writeText(voiceText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/40 sm:p-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mic className="h-6 w-6 text-red-500" />
          <span>Voice Dictation & Speech Hub</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Dictate ideas, meeting notes, or commands hands-free. Direct real-time speech recognition sends text straight into AI Chat, Reminders, or Document Search.
        </p>
      </div>

      {/* Mic Status & Waveform visualizer card */}
      <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onToggleListen}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-red-500 text-white shadow-xl shadow-red-500/30 scale-105 animate-pulse'
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105'
          }`}
        >
          {isListening ? <Mic className="h-10 w-10" /> : <MicOff className="h-10 w-10" />}
          {isListening && (
            <span className="absolute -inset-2 rounded-full border-2 border-red-400/60 animate-ping" />
          )}
        </button>

        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          {isListening ? 'Listening... Speak into your microphone' : 'Tap Microphone to Start Voice Dictation'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {isListening ? 'Browser Web Speech API active' : 'Click the button above or toggle microphone anywhere in Nexus AI'}
        </p>

        {/* Animated Waveform bars when listening */}
        {isListening && (
          <div className="mt-6 flex items-center gap-1.5 h-8">
            {[0.4, 0.8, 1, 0.5, 0.9, 0.3, 0.7, 1, 0.6, 0.4].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-red-500 rounded-full animate-bounce"
                style={{
                  height: `${h * 28}px`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live Transcript Output Card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Radio className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
            <span>Captured Voice Dictation Transcript</span>
          </div>

          {voiceText && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          )}
        </div>

        <div className="mt-4 min-h-[100px] rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-mono">
          {voiceText ? (
            voiceText
          ) : (
            <span className="text-slate-400 italic font-sans">
              No speech captured yet. Turn on the mic and start talking...
            </span>
          )}
        </div>

        {/* Quick Send Destinations */}
        {voiceText && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Send Transcript Directly To:</span>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onSendToChat(voiceText)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Send to AI Chat</span>
              </button>

              <button
                onClick={() => onSendToReminder(voiceText)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition"
              >
                <Bell className="h-4 w-4" />
                <span>Parse as Smart Reminder</span>
              </button>

              <button
                onClick={() => onSendToSearch(voiceText)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 transition dark:bg-slate-700"
              >
                <FileText className="h-4 w-4" />
                <span>Search Knowledge Base</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
