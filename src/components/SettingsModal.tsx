
import React, { useEffect, useState } from 'react';
import {
  Settings,
  X,
  Mic,
  Volume2,
  Bell,
  Moon,
  Sun,
  Monitor,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  microphone: boolean;
  readAloud: boolean;
  autoRead: boolean;
  volume: number;
  theme: Theme;
  animations: boolean;
  autoDocuments: boolean;
  enterToSend: boolean;
  reminders: boolean;
  notifications: boolean;
  soundAlerts: boolean;
}

const STORAGE_KEY = 'oneai-settings';

const DEFAULT_SETTINGS: SettingsState = {
  microphone: true,
  readAloud: true,
  autoRead: false,
  volume: 80,
  theme: 'dark',
  animations: true,
  autoDocuments: true,
  enterToSend: true,
  reminders: true,
  notifications: false,
  soundAlerts: true,
};

const loadSettings = (): SettingsState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return saved
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] =
    useState<SettingsState>(DEFAULT_SETTINGS);

  const [micStatus, setMicStatus] = useState<
    'unknown' | 'allowed' | 'blocked'
  >('unknown');

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      checkMicrophone();
    }
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings),
    );
  }, [settings]);

  if (!isOpen) return null;

  const update = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function checkMicrophone() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicStatus('blocked');
        return;
      }

      setMicStatus('unknown');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        setMicStatus('allowed');
        update('microphone', true);

        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setMicStatus('blocked');
        update('microphone', false);
      }
    } catch {
      setMicStatus('blocked');
      update('microphone', false);
    }
  }

  async function testMicrophone() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      setMicStatus('allowed');
      update('microphone', true);

      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setMicStatus('blocked');
      update('microphone', false);
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported.');
      return;
    }

    const permission =
      await Notification.requestPermission();

    update(
      'notifications',
      permission === 'granted',
    );
  }

  function resetSettings() {
    if (
      !window.confirm(
        'Reset all OneAI settings to their defaults?',
      )
    ) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <Settings className="h-5 w-5 text-indigo-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                OneAI Settings
              </h2>

              <p className="text-xs text-slate-500">
                Customize your OneAI experience.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings */}
        <div className="overflow-y-auto p-5">
          <div className="space-y-5">

            {/* Audio */}
            <Section
              icon={<Mic className="h-4 w-4" />}
              title="Audio & Voice"
              description="Control microphone and voice features."
            >
              <SettingRow
                icon={<Mic className="h-4 w-4" />}
                title="Microphone"
                description="Allow OneAI to use your microphone."
              >
                <Toggle
                  enabled={settings.microphone}
                  onChange={(value) =>
                    update('microphone', value)
                  }
                />
              </SettingRow>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Microphone Status
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        micStatus === 'allowed'
                          ? 'text-emerald-400'
                          : micStatus === 'blocked'
                            ? 'text-red-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {micStatus === 'allowed'
                        ? 'Microphone allowed'
                        : micStatus === 'blocked'
                          ? 'Microphone blocked'
                          : 'Permission not tested'}
                    </p>
                  </div>

                  <button
                    onClick={testMicrophone}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:border-indigo-500"
                  >
                    Test Microphone
                  </button>
                </div>

                {micStatus === 'blocked' && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400" />

                    <p className="text-xs leading-5 text-red-300">
                      Microphone access is blocked.
                      Allow microphone permission for OneAI in
                      Android Settings, then tap Test Microphone again.
                    </p>
                  </div>
                )}
              </div>

              <SettingRow
                icon={<Volume2 className="h-4 w-4" />}
                title="Read Aloud"
                description="Allow OneAI to read responses aloud."
              >
                <Toggle
                  enabled={settings.readAloud}
                  onChange={(value) =>
                    update('readAloud', value)
                  }
                />
              </SettingRow>

              <SettingRow
                icon={<Volume2 className="h-4 w-4" />}
                title="Automatically Read Responses"
                description="Read new AI responses automatically."
              >
                <Toggle
                  enabled={settings.autoRead}
                  onChange={(value) =>
                    update('autoRead', value)
                  }
                />
              </SettingRow>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">
                    Voice Volume
                  </p>

                  <span className="text-xs text-slate-400">
                    {settings.volume}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) =>
                    update(
                      'volume',
                      Number(e.target.value),
                    )
                  }
                  className="mt-4 w-full accent-indigo-500"
                />
              </div>
            </Section>

            {/* Appearance */}
            <Section
              icon={<Settings className="h-4 w-4" />}
              title="Appearance"
              description="Control how OneAI looks."
            >
              <div className="grid grid-cols-3 gap-2">
                <ThemeButton
                  icon={<Moon className="h-4 w-4" />}
                  label="Dark"
                  active={settings.theme === 'dark'}
                  onClick={() => update('theme', 'dark')}
                />

                <ThemeButton
                  icon={<Sun className="h-4 w-4" />}
                  label="Light"
                  active={settings.theme === 'light'}
                  onClick={() => update('theme', 'light')}
                />

                <ThemeButton
                  icon={<Monitor className="h-4 w-4" />}
                  label="System"
                  active={settings.theme === 'system'}
                  onClick={() =>
                    update('theme', 'system')
                  }
                />
              </div>

              <SettingRow
                title="Animations"
                description="Enable interface animations."
              >
                <Toggle
                  enabled={settings.animations}
                  onChange={(value) =>
                    update('animations', value)
                  }
                />
              </SettingRow>
            </Section>

            {/* Chat */}
            <Section
              icon={<MessageSquare className="h-4 w-4" />}
              title="Chat"
              description="Customize your conversations."
            >
              <SettingRow
                title="Use Attached Documents"
                description="Automatically use selected documents as context."
              >
                <Toggle
                  enabled={settings.autoDocuments}
                  onChange={(value) =>
                    update('autoDocuments', value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Enter to Send"
                description="Press Enter to send messages."
              >
                <Toggle
                  enabled={settings.enterToSend}
                  onChange={(value) =>
                    update('enterToSend', value)
                  }
                />
              </SettingRow>
            </Section>

            {/* Notifications */}
            <Section
              icon={<Bell className="h-4 w-4" />}
              title="Notifications"
              description="Manage OneAI alerts."
            >
              <SettingRow
                icon={<Bell className="h-4 w-4" />}
                title="Smart Reminders"
                description="Allow OneAI reminders."
              >
                <Toggle
                  enabled={settings.reminders}
                  onChange={(value) =>
                    update('reminders', value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Sound Alerts"
                description="Play sounds for important notifications."
              >
                <Toggle
                  enabled={settings.soundAlerts}
                  onChange={(value) =>
                    update('soundAlerts', value)
                  }
                />
              </SettingRow>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Browser Notifications
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Receive notifications outside OneAI.
                    </p>
                  </div>

                  <button
                    onClick={enableNotifications}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:border-indigo-500"
                  >
                    {settings.notifications
                      ? 'Allowed'
                      : 'Enable'}
                  </button>
                </div>
              </div>
            </Section>

            {/* Privacy */}
            <Section
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Privacy & Security"
              description="Manage local OneAI preferences."
            >
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />

                  <div>
                    <p className="text-sm font-medium text-white">
                      Protected Settings
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your interface preferences are stored
                      locally in this browser.
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetSettings}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset Settings
                </button>
              </div>
            </Section>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Check className="h-4 w-4 text-emerald-400" />
            Saved automatically
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Reusable Components ---------- */

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        <p className="text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>

    <div className="space-y-3">{children}</div>
  </section>
);

const SettingRow: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 text-slate-400">
          {icon}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>

    {children}
  </div>
);

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (value: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
      enabled ? 'bg-indigo-600' : 'bg-slate-700'
    }`}
    aria-label={enabled ? 'Enabled' : 'Disabled'}
  >
    <span
      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
        enabled ? 'left-6' : 'left-1'
      }`}
    />
  </button>
);

const ThemeButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${
      active
        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
    }`}
  >
    {icon}
    {label}

    {active && (
      <Check className="h-3.5 w-3.5 text-indigo-400" />
    )}
  </button>
);

export default SettingsModal;
