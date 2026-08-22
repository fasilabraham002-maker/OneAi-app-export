import React, { useState, useEffect, useRef } from 'react';
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App as CapacitorApp } from "@capacitor/app";
import { Geolocation } from "@capacitor/geolocation";
import { Contacts } from "@capacitor-community/contacts";
import { User, ChatMessage, UploadedDocument, Reminder } from './types';
import { UserCheck, ShieldCheck } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { DocumentSearch } from './components/DocumentSearch';
import { SmartReminders } from './components/SmartReminders';
import { VoiceController } from './components/VoiceController';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import SettingsModal from './components/SettingsModal';


const API_BASE_URL = 'https://oneai-app-export.onrender.com';
export default function App() {
  // Apply OneAI theme immediately when the app starts
  useEffect(() => {
    try {
      const saved = localStorage.getItem('oneai-settings');
      const theme = saved ? JSON.parse(saved).theme : 'light';
      const root = document.documentElement;

      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
        root.style.colorScheme = prefersDark ? 'dark' : 'light';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    } catch (error) {
      console.error('Failed to apply startup theme:', error);
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, []);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Restore saved authentication session on app startup
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('oneai_auth_token');
      const savedUser = localStorage.getItem('oneai_user');

      if (savedToken && savedUser) {
        setAuthToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to restore authentication session:', error);
      localStorage.removeItem('oneai_auth_token');
      localStorage.removeItem('oneai_user');
    }
  }, []);

  // App data state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      content: "Hello! I'm OneAI. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Voice Speech Recognition State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef<any>(null);

  // Loading indicator for chat
  const [chatLoading, setChatLoading] = useState(false);

  // Load user data & documents/reminders after authentication is restored
  useEffect(() => {
    if (!authToken) {
      return;
    }

    fetchDocuments();
    fetchReminders();
  }, [authToken]);

  // Refresh OneAI data whenever the Android app returns to the foreground
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setupAppResumeListener = async () => {
      listenerHandle = await CapacitorApp.addListener(
        'appStateChange',
        ({ isActive }) => {
          if (!isActive) {
            return;
          }

          const savedToken = localStorage.getItem('oneai_auth_token');

          if (!savedToken) {
            return;
          }

          console.log(
            'OneAI resumed: refreshing reminders and documents...'
          );

          fetchDocuments();
          fetchReminders();
        }
      );
    };

    setupAppResumeListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [authToken]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reminders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    }
  };

  // Native Android location permission
  const requestLocationPermission = async () => {
    try {
      console.log("Checking location permission...");
      const permission = await Geolocation.checkPermissions();
      console.log("Initial location permission:", permission);

      const finalPermission =
        permission.location === "granted"
          ? permission
          : await Geolocation.requestPermissions();

      console.log("Final location permission:", finalPermission);

      if (finalPermission.location !== "granted") {
        console.warn("OneAI location permission denied.");
        alert(
          "Location permission is required for this OneAI feature. Please allow location access in Android settings."
        );
        return false;
      }

      console.log("OneAI location permission granted.");
      return true;
    } catch (error) {
      console.error("OneAI location permission error:", error);
      alert("Unable to request location permission.");
      return false;
    }
  };

  // Native Android contacts permission
  const requestContactsPermission = async () => {
    try {
      console.log("Checking contacts permission...");
      const permission = await Contacts.checkPermissions();
      console.log("Initial contacts permission:", permission);

      const finalPermission =
        permission.contacts === "granted"
          ? permission
          : await Contacts.requestPermissions();

      console.log("Final contacts permission:", finalPermission);

      if (finalPermission.contacts !== "granted") {
        console.warn("OneAI contacts permission denied.");
        alert(
          "Contacts permission is required for this OneAI feature. Please allow contacts access in Android settings."
        );
        return false;
      }

      console.log("OneAI contacts permission granted.");
      return true;
    } catch (error) {
      console.error("OneAI contacts permission error:", error);
      alert("Unable to request contacts permission.");
      return false;
    }
  };

  // Native Android voice recognition
  const toggleVoiceListening = async () => {
    try {
      console.log("=== ONEAI VOICE DIAGNOSTIC: START ===");

      if (isVoiceListening) {
        console.log("Stopping voice recognition...");
        await SpeechRecognition.stop();
        setIsVoiceListening(false);
        return;
      }

      console.log("Checking speech recognition permission...");
      const permission = await SpeechRecognition.checkPermissions();
      console.log("Initial permission:", permission);

      const finalPermission =
        permission.speechRecognition === "granted"
          ? permission
          : await SpeechRecognition.requestPermissions();

      console.log("Final permission:", finalPermission);

      if (finalPermission.speechRecognition !== "granted") {
        console.error("OneAI voice permission denied:", finalPermission);
        setIsVoiceListening(false);
        alert(
          "Microphone permission is required for OneAI Voice. Please allow microphone access in Android settings."
        );
        return;
      }

      console.log("Checking Android speech recognition availability...");
      const availability = await SpeechRecognition.available();

      console.log("=== ONEAI VOICE AVAILABILITY ===");
      console.log("Availability response:", availability);
      console.log("available:", availability?.available);

      if (!availability.available) {
        console.error(
          "OneAI voice recognition is unavailable:",
          availability
        );
        setIsVoiceListening(false);
        alert(
          "Android reports that speech recognition is unavailable.\n\nDiagnostic: " +
            JSON.stringify(availability)
        );
        return;
      }

      setVoiceText("");

      console.log("Starting native speech recognition...");

      await SpeechRecognition.start({
        language: "en-US",
        maxResults: 3,
        partialResults: true,
        popup: false,
      });

      console.log("=== ONEAI VOICE START REQUEST SENT ===");
    } catch (error) {
      console.error("=== ONEAI NATIVE VOICE ERROR ===");
      console.error("Raw error:", error);
      console.error("JSON error:", JSON.stringify(error));

      setIsVoiceListening(false);

      alert(
        "OneAI Voice error:\n\n" +
          JSON.stringify(error)
      );
    }
  };

  useEffect(() => {
    let resultListener: any;
    let stateListener: any;
    let errorListener: any;

    const setupVoiceListeners = async () => {
      try {
        resultListener = await SpeechRecognition.addListener(
          "partialResults",
          (data: any) => {
            console.log("=== ONEAI RAW SPEECH RESULT ===");
            console.log("Raw data:", data);
            console.log("JSON data:", JSON.stringify(data));

            const matches = Array.isArray(data?.matches) ? data.matches : [];

            const text =
              typeof data?.accumulatedText === "string" && data.accumulatedText.trim()
                ? data.accumulatedText.trim()
                : typeof data?.accumulated === "string" && data.accumulated.trim()
                  ? data.accumulated.trim()
                  : typeof matches[0] === "string"
                    ? matches[0].trim()
                    : "";

            console.log("Extracted transcript:", text);

            if (text) {
              setVoiceText(text);
            }
          }
        );

        stateListener = await SpeechRecognition.addListener(
          "listeningState",
          (data: any) => {
            setIsVoiceListening(
              data?.state === "started" ||
              data?.status === "started"
            );
          }
        );

        errorListener = await SpeechRecognition.addListener(
          "error",
          (data: any) => {
            console.warn("OneAI native speech error:", data);
            setIsVoiceListening(false);
          }
        );
      } catch (error) {
        console.warn(
          "OneAI speech listeners could not be initialized:",
          error
        );
      }
    };

    setupVoiceListeners();

    return () => {
      resultListener?.remove();
      stateListener?.remove();
      errorListener?.remove();
    };
  }, []);

  // Chat message submit handler
  const handleSendMessage = async (text: string, attachedDocs: string[], systemInstruction?: string) => {
    if (chatLoading) {
      console.log("OneAI: chat request already in progress.");
      return;
    }

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = messages.slice(-8); // Send last 8 messages for memory context
      const res = await fetch(`${API_BASE_URL}/api/chat/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: text,
          history,
          attachedDocIds: attachedDocs,
          systemInstruction,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI generation failed');
      }

      if (!res.body) {
        throw new Error('Streaming response is not supported by this browser.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedText = '';
      let sources: ChatMessage['sources'] = [];

      const aiMessageId = `m-ai-${Date.now()}`;

      // Add an empty assistant message immediately so the UI can update
      // as OneAI sends each chunk.
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          sender: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          sources: [],
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          let event;
          try {
            event = JSON.parse(trimmedLine);
          } catch (parseError) {
            console.warn('OneAI stream parse warning:', trimmedLine);
            continue;
          }

          if (event.type === 'chunk') {
            streamedText += event.text;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? { ...msg, content: streamedText }
                  : msg
              )
            );
          } else if (event.type === 'done') {
            sources = event.sources || [];

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content:
                        event.reply ||
                        streamedText ||
                        'I processed your request, but received an empty response from OneAI.',
                      sources,
                    }
                  : msg
              )
            );
          } else if (event.type === 'error') {
            throw new Error(event.error || 'OneAI generation failed');
          }
        }
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `m-err-${Date.now()}`,
        sender: 'assistant',
        content: `Sorry, I encountered an issue: ${err.message || 'Server error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Document upload & delete handlers
  const handleUploadDocument = async (
    title: string,
    fileName: string,
    fileType: string,
    content: string
  ) => {
    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title, fileName, fileType, content }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload document');

    setDocuments((prev) => [data.document, ...prev]);
  };

  const handleDeleteDocument = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Schedule a native Android notification for a reminder
  const scheduleReminderNotification = async (reminder: Reminder) => {
    try {
      const dueDate = new Date(reminder.dueDate);

      if (isNaN(dueDate.getTime())) {
        console.error('Invalid reminder due date:', reminder.dueDate);
        return;
      }

      if (dueDate.getTime() <= Date.now()) {
        console.warn('Reminder due date is already in the past:', dueDate);
        return;
      }

      const permission = await LocalNotifications.checkPermissions();

      const finalPermission =
        permission.display === 'granted'
          ? permission
          : await LocalNotifications.requestPermissions();

      if (finalPermission.display !== 'granted') {
        console.warn('Android notification permission was not granted.');
        return;
      }

      await LocalNotifications.createChannel({
        id: 'oneai-reminders',
        name: 'OneAI Reminders',
        description: 'Notifications for OneAI reminders',
        importance: 5,
        visibility: 1,
        sound: 'default',
      });

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.abs(
              Array.from(reminder.id).reduce(
                (hash: number, char: string) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
                0
              )
            ) || Math.floor(Math.random() * 2147483647),
            title: `OneAI Reminder: ${reminder.title}`,
            body: reminder.description || 'You have a reminder.',
            channelId: 'oneai-reminders',
            isExactNotification: true,
            schedule: {
              at: dueDate,
              allowWhileIdle: true,
            },
            extra: {
              reminderId: reminder.id,
            },
          },
        ],
      });

      console.log(
        'OneAI reminder notification scheduled:',
        reminder.id,
        dueDate.toISOString()
      );
    } catch (error) {
      console.error('Failed to schedule reminder notification:', error);
    }
  };

  // Reminder handlers
  const handleAddReminder = async (reminder: Reminder) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(reminder),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save reminder');
      }

      setReminders((prev) => [data.reminder, ...prev]);

      // Schedule the native Android notification after the server saves the reminder.
      await scheduleReminderNotification(data.reminder);
    } catch (error: any) {
      console.error('Failed to save reminder:', error);
      alert(`Could not save reminder: ${error.message}`);
    }
  };

  const handleUpdateReminder = async (updated: Reminder) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reminders/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updated),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update reminder');
      }

      const savedReminder = data.reminder || updated;

      setReminders((prev) =>
        prev.map((r) => (r.id === savedReminder.id ? savedReminder : r))
      );

      // Cancel the old notification before scheduling the updated reminder.
      try {
        const notificationId =
          Math.abs(
            Array.from(String(savedReminder.id)).reduce(
              (hash: number, char: string) =>
                ((hash << 5) - hash + char.charCodeAt(0)) | 0,
              0
            )
          ) || 1;

        await LocalNotifications.cancel({
          notifications: [{ id: notificationId }],
        });
      } catch (error) {
        console.warn('Could not cancel old reminder notification:', error);
      }

      // Schedule the updated reminder notification.
      await scheduleReminderNotification(savedReminder);
    } catch (error: any) {
      console.error('Failed to update reminder:', error);
      alert(`Could not update reminder: ${error.message}`);
      await fetchReminders();
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const notificationId =
        Math.abs(
          Array.from(id).reduce(
            (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
            0
          )
        ) || 1;

      // Cancel the native Android notification first.
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: notificationId }],
        });
      } catch (error) {
        console.warn('Could not cancel reminder notification:', error);
      }

      const res = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete reminder');
      }

      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      console.error('Failed to delete reminder:', error);
      alert(`Could not delete reminder: ${error.message}`);
      await fetchReminders();
    }
  };

  // Global Quick Search trigger
  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;

    if (activeTab !== 'documents') {
      setActiveTab('documents');
    }
  };

  // Auth & Profile actions
  const handleAuthSuccess = (loggedUser: User, token: string) => {
    console.log("AUTH SUCCESS:", loggedUser.email);

    setUser(loggedUser);
    setAuthToken(token);

    localStorage.setItem("oneai_auth_token", token);
    localStorage.setItem("oneai_user", JSON.stringify(loggedUser));

    setIsAuthModalOpen(false);
    setIsProfileModalOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken('');
    setDocuments([]);
    setReminders([]);

    localStorage.removeItem('oneai_auth_token');
    localStorage.removeItem('oneai_user');
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Navigation Header */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isVoiceListening={isVoiceListening}
        onToggleVoice={toggleVoiceListening}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={globalSearch}
        setSearchQuery={setGlobalSearch}
        onGlobalSearch={handleGlobalSearchSubmit}
      />

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadRemindersCount={reminders.filter((r) => !r.isCompleted).length}
          documentsCount={documents.length}
        />

        {/* View Router Workspace */}
        <main className="min-w-0 flex-1 overflow-hidden bg-slate-950">
          {activeTab === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              documents={documents}
              isVoiceListening={isVoiceListening}
              onToggleVoice={toggleVoiceListening}
              voiceText={voiceText}
              loading={chatLoading}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentSearch
              documents={documents}
              authToken={authToken}
              onUploadDocument={handleUploadDocument}
              onDeleteDocument={handleDeleteDocument}
              isVoiceListening={isVoiceListening}
              onToggleVoice={toggleVoiceListening}
              voiceText={voiceText}
            />
          )}

          {activeTab === 'reminders' && (
            <SmartReminders
              reminders={reminders}
              authToken={authToken}
              onAddReminder={handleAddReminder}
              onUpdateReminder={handleUpdateReminder}
              onDeleteReminder={handleDeleteReminder}
              isVoiceListening={isVoiceListening}
              onToggleVoice={toggleVoiceListening}
              voiceText={voiceText}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceController
              isListening={isVoiceListening}
              onToggleListen={toggleVoiceListening}
              voiceText={voiceText}
              onClearTranscript={() => setVoiceText('')}
              onSendToChat={(text) => {
                setActiveTab('chat');
                handleSendMessage(text, []);
              }}
              onSendToReminder={async (text) => {
                setActiveTab('reminders');
                const res = await fetch(`${API_BASE_URL}/api/reminders/parse-ai`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: text }),
                });
                const data = await res.json();
                if (data.reminder) handleAddReminder(data.reminder);
              }}
              onSendToSearch={(text) => {
                setGlobalSearch(text);
                setActiveTab('documents');
              }}
            />
          )}

          {activeTab === 'account' && (
              <div className="h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                        <UserCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-white sm:text-2xl">
                          Account & Workspace
                        </h1>
                        <p className="mt-1 text-sm text-slate-400">
                          Manage your OneAI profile, security, and preferences.
                        </p>
                      </div>
                    </div>
                  </div>

                  {user ? (
                    <div className="space-y-5">
                      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>

                            <div>
                              <p className="text-lg font-bold text-white">
                                {user.name}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">
                                {user.email}
                              </p>
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Account active
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
<button
  type="button"
        onClick={() => setActiveTab('workspace')}
  className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-indigo-500/60 hover:bg-slate-900"
>
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
    Workspace
  </p>
  <p className="mt-2 text-sm font-semibold text-white">
    OneAI Intelligent Workspace
  </p>
  <p className="mt-1 text-xs text-slate-400">
    AI chat, documents, reminders and voice tools.
  </p>
  <p className="mt-3 text-[11px] font-semibold text-indigo-400 opacity-0 transition group-hover:opacity-100">
    Open workspace tools →
  </p>
</button>

<button
  type="button"
        onClick={() => setIsSettingsModalOpen(true)}
  className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-emerald-500/60 hover:bg-slate-900"
>
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
    Security
  </p>
  <p className="mt-2 text-sm font-semibold text-white">
    Protected session
  </p>
  <p className="mt-1 text-xs text-slate-400">
    Manage authentication and account security.
  </p>
  <p className="mt-3 text-[11px] font-semibold text-emerald-400 opacity-0 transition group-hover:opacity-100">
    Open security settings →
  </p>
</button>
</div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Profile & Preferences
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Personalize your OneAI experience.
                            </p>
                          </div>

                          <button
                            onClick={() => {
                    setIsProfileModalOpen(true);
                  }}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-700"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-xl">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
                        <UserCheck className="h-8 w-8 text-indigo-400" />
                      </div>

                      <h2 className="mt-5 text-xl font-bold text-white">
                        Welcome to OneAI
                      </h2>

                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                        Sign in to manage your profile, preferences, security,
                        and personalized workspace.
                      </p>

                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
                      >
                        Sign In / Create Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

      {/* Workspace Hub */}
      {activeTab === 'workspace' && (
        <div className="h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                OneAI Workspace
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Choose a tool to continue working with OneAI.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-left transition hover:border-indigo-500/60 hover:bg-slate-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  AI Chat
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Conversations
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Chat with OneAI and work with your AI assistant.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-left transition hover:border-violet-500/60 hover:bg-slate-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                  Documents
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Document Search
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Search and work with your uploaded documents.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reminders')}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-left transition hover:border-amber-500/60 hover:bg-slate-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Reminders
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Smart Reminders
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Create and manage your AI-powered reminders.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('voice')}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-left transition hover:border-emerald-500/60 hover:bg-slate-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Voice Tools
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Voice Assistant
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Use OneAI voice tools for hands-free interaction.
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="mt-6 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-700"
            >
              ← Back to Account
            </button>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="h-full overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    Security Settings
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Manage authentication and account security.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Protected Session
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Your OneAI session is protected while you are signed in.
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    Active
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-sm font-semibold text-white">
                  Authentication
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your account authentication is currently enabled.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <p className="text-sm font-semibold text-white">
                  Account Security
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Keep your account credentials private and sign out when using a shared device.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-indigo-500 hover:bg-slate-700"
              >
                ← Back to Account
              </button>
            </div>
          </div>
        </div>
      )}


</main>
</div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Profile Modal */}
      {user && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          onLogout={handleLogout}
        />
      )}

    </div>
  );

}
