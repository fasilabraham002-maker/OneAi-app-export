import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Copy,
  Check,
  Radio,
  FileText,
  Bell,
  MessageSquare,
  Trash2,
} from 'lucide-react';

interface VoiceControllerProps {
  isListening: boolean;
  onToggleListen: () => void;
  voiceText: string;
  onClearTranscript: () => void;
  onSendToChat: (text: string) => void;
  onSendToReminder: (text: string) => void;
  onSendToSearch: (text: string) => void;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  isListening,
  onToggleListen,
  voiceText,
  onClearTranscript,
  onSendToChat,
  onSendToReminder,
  onSendToSearch,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!voiceText) return;

    try {
      await navigator.clipboard.writeText(voiceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-900/40 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <Mic className="h-6 w-6 text-red-500" />
          <span>Voice Tools</span>
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Speak naturally and send your live transcription directly to
          OneAI tools.
        </p>
      </div>

      {/* Microphone Control */}
      <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-sm">
        <button
          onClick={onToggleListen}
          aria-label={
            isListening ? 'Stop voice dictation' : 'Start voice dictation'
          }
          className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
            isListening
              ? 'scale-105 bg-red-500 text-white shadow-xl shadow-red-500/30'
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105'
          }`}
        >
          {isListening ? (
            <Mic className="h-10 w-10" />
          ) : (
            <MicOff className="h-10 w-10" />
          )}

          {isListening && (
            <span className="absolute -inset-2 rounded-full border-2 border-red-400/60 animate-ping" />
          )}
        </button>

        <h3 className="mt-4 text-base font-bold text-white">
          {isListening
            ? 'Listening... Speak naturally'
            : 'Tap Microphone to Start'}
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          {isListening
            ? 'Your speech will appear below in real time'
            : 'Start voice dictation whenever you are ready'}
        </p>

        {isListening && (
          <div className="mt-6 flex h-8 items-center gap-1.5">
            {[0.4, 0.8, 1, 0.5, 0.9, 0.3, 0.7, 1, 0.6, 0.4].map(
              (height, index) => (
                <div
                  key={index}
                  className="w-1.5 rounded-full bg-red-500 animate-bounce"
                  style={{
                    height: `${height * 28}px`,
                    animationDelay: `${index * 100}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Live Transcript */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        {/* Transcript Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isListening
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              <Radio
                className={`h-4 w-4 ${
                  isListening ? 'animate-pulse text-red-400' : ''
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Live Transcript
                </h3>

                {isListening && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[11px] text-slate-500">
                {isListening
                  ? 'Listening for your voice...'
                  : voiceText
                    ? 'Voice transcription captured'
                    : 'Waiting for speech'}
              </p>
            </div>
          </div>

          {voiceText && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/10 hover:text-indigo-300"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                onClick={onClearTranscript}
                disabled={isListening}
                title={
                  isListening
                    ? 'Stop listening before clearing'
                    : 'Clear transcript'
                }
                className="flex items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Spoken Text */}
        <div className="min-h-[130px] px-5 py-5">
          {voiceText ? (
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">
              {voiceText}

              {isListening && (
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-red-400 align-middle" />
              )}
            </div>
          ) : (
            <div className="flex min-h-[90px] items-center justify-center text-center">
              <div>
                <Mic
                  className={`mx-auto h-7 w-7 ${
                    isListening
                      ? 'text-red-400 animate-pulse'
                      : 'text-slate-600'
                  }`}
                />

                <p className="mt-3 text-sm italic text-slate-500">
                  {isListening
                    ? 'Start speaking... your words will appear here.'
                    : 'No speech captured yet. Turn on the mic and start talking.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="border-t border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isListening
                  ? 'bg-red-500 animate-pulse'
                  : voiceText
                    ? 'bg-emerald-500'
                    : 'bg-slate-600'
              }`}
            />

            <span>
              {isListening
                ? 'Live transcription active'
                : voiceText
                  ? 'Transcript ready'
                  : 'Microphone is idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Voice Actions */}
      {voiceText && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Voice Actions</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Use your captured speech in another OneAI tool.
              </p>
            </div>

            <div className="rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-400">
              Ready
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => onSendToChat(voiceText)}
              className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3 text-left transition hover:border-indigo-500/50 hover:bg-indigo-500/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <MessageSquare className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  AI Chat
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Continue conversation
                </p>
              </div>
            </button>

            <button
              onClick={() => onSendToReminder(voiceText)}
              className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3 text-left transition hover:border-amber-500/50 hover:bg-amber-500/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Bell className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  Smart Reminder
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Create from speech
                </p>
              </div>
            </button>

            <button
              onClick={() => onSendToSearch(voiceText)}
              className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileText className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  Knowledge Search
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Search your documents
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
