import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  X,
  Bell,
  Volume2,
  LogOut,
  Mic,
  MicOff,
  Moon,
  Sun,
  Settings,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { User } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  initialSection?: 'workspace' | 'security';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  initialSection,
}) => {
  const [autoTTS, setAutoTTS] = useState(
    user.preferences?.autoTextToSpeech ?? false
  );

  const [notifications, setNotifications] = useState(
    user.preferences?.reminderNotifications ?? true
  );

  const [microphoneAllowed, setMicrophoneAllowed] = useState(false);
  const [micTesting, setMicTesting] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [speechRate, setSpeechRate] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    const checkMicrophone = async () => {
      try {
        if (!navigator.permissions) return;

        const permission = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });

        setMicrophoneAllowed(permission.state === 'granted');

        permission.onchange = () => {
          setMicrophoneAllowed(permission.state === 'granted');
        };
      } catch {
        // Some browsers do not support microphone permission queries.
      }
    };

    checkMicrophone();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !initialSection) return;

    const sectionId =
      initialSection === 'workspace'
        ? 'workspace-preferences'
        : 'security-encryption';

    const timer = window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      const container = target?.closest('.overflow-y-auto') as HTMLElement | null;

      if (!target || !container) return;

      const top =
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        12;

      container.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      setMicrophoneAllowed(true);

      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Microphone permission error:', error);

      alert(
        'Microphone access was denied. Please open Chrome Site Settings for OneAI and allow Microphone access.'
      );
    }
  };

  const testMicrophone = async () => {
    if (micTesting) return;

    try {
      setMicTesting(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      setMicrophoneAllowed(true);

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);

        const started = Date.now();

        const checkLevel = () => {
          analyser.getByteTimeDomainData(data);

          const elapsed = Date.now() - started;

          if (elapsed < 1200) {
            requestAnimationFrame(checkLevel);
          } else {
            stream.getTracks().forEach((track) => track.stop());
            audioContext.close();
            setMicTesting(false);
          }
        };

        checkLevel();
      } else {
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          setMicTesting(false);
        }, 1200);
      }
    } catch (error) {
      console.error('Microphone test failed:', error);
      setMicTesting(false);

      alert(
        'Microphone test failed. Please allow microphone access in Chrome Site Settings.'
      );
    }
  };

  const testSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported by this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(
      'Hello. This is OneAI voice testing.'
    );

    speech.rate = speechRate;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
  };

  const toggleDarkMode = () => {
    setDarkMode((value) => !value);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Settings className="h-5 w-5 text-indigo-400" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">
                Account & Settings
              </h2>
              <p className="text-xs text-slate-400">
                Control your OneAI workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 py-5">
          {/* Account */}
          <section>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white">{user.name}</h3>

                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    VERIFIED
                  </span>
                </div>

                <p className="truncate text-xs text-slate-400">
                  {user.email}
                </p>

                <p className="mt-1 text-[10px] text-slate-500">
                  Account ID: {user.id}
                </p>
              </div>
            </div>
          </section>

          {/* Microphone */}
          <section className="mt-5">
            <div className="mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Voice & Microphone
              </h3>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      microphoneAllowed
                        ? 'bg-emerald-500/10'
                        : 'bg-amber-500/10'
                    }`}
                  >
                    {microphoneAllowed ? (
                      <Mic className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <MicOff className="h-5 w-5 text-amber-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Microphone Access
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {microphoneAllowed
                            ? 'Microphone permission is enabled.'
                            : 'Allow OneAI to use your microphone for voice features.'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
                          microphoneAllowed
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {microphoneAllowed ? 'ALLOWED' : 'NOT ALLOWED'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={requestMicrophone}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                      >
                        Allow Microphone
                      </button>

                      <button
                        type="button"
                        onClick={testMicrophone}
                        disabled={micTesting}
                        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-indigo-500 disabled:opacity-50"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        {micTesting ? 'Testing...' : 'Test Microphone'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-800/60 p-3 text-[11px] text-slate-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span>
                    Chrome controls the actual microphone permission. OneAI
                    cannot override a permission that Chrome has blocked.
                  </span>
                </div>
              </div>

              {/* TTS */}
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-indigo-400" />

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Auto Text-to-Speech
                    </p>
                    <p className="text-xs text-slate-400">
                      Read assistant replies aloud automatically
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoTTS((value) => !value)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    autoTTS ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      autoTTS ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Voice test */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Voice Test
                    </p>
                    <p className="text-xs text-slate-400">
                      Test OneAI's browser voice
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={testSpeech}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:border-indigo-500"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Test Voice
                  </button>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-slate-400">Speech speed</span>
                    <span className="font-semibold text-indigo-400">
                      {speechRate.toFixed(1)}x
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(event) =>
                      setSpeechRate(Number(event.target.value))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Workspace */}
          <section id="workspace-preferences" className="mt-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Workspace Preferences
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-amber-400" />

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Smart Notifications
                    </p>
                    <p className="text-xs text-slate-400">
                      Receive alerts for high-priority tasks
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNotifications((value) => !value)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    notifications ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      notifications ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  {darkMode ? (
                    <Moon className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-amber-400" />
                  )}

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Appearance
                    </p>
                    <p className="text-xs text-slate-400">
                      {darkMode ? 'Dark mode' : 'Light mode'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500">
                  CHANGE
                </span>
              </button>
            </div>
          </section>

          {/* Security */}
          <section id="security-encryption" className="mt-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Security & Encryption
            </h3>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  Session Encryption
                </span>

                <span className="font-bold text-emerald-400">
                  SHA-256 Active
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <Key className="h-4 w-4 text-indigo-400" />
                  Server-side API Isolation
                </span>

                <span className="font-bold text-indigo-400">
                  Isolated
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Your browser controls sensitive device permissions.
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
