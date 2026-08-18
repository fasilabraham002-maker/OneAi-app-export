import React, { useState, useEffect, useRef } from 'react';
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

export default function App() {
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

  // Load user data & documents/reminders on boot
  useEffect(() => {
    fetchDocuments();
    fetchReminders();
  }, [authToken]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents', {
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
      const res = await fetch('/api/reminders', {
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

  // Voice recognition setup
  const toggleVoiceListening = async () => {
    if (isVoiceListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Recognition may already be stopped.
        }
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Voice recognition is not available in this browser. Please use Chrome and allow microphone access for OneAI.'
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert(
        'Microphone access is not available. Please use Chrome over HTTPS.'
      );
      return;
    }

    try {
      // Ask Chrome for microphone permission before starting recognition.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Release the temporary permission-check stream.
      stream.getTracks().forEach((track) => track.stop());

      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('OneAI voice recognition started');
        setIsVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        transcript = transcript.trim();

        if (transcript) {
          setVoiceText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('OneAI speech recognition error:', event.error);

        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed'
        ) {
          alert(
            'Microphone access was denied. Open Chrome Site Settings for OneAI and set Microphone to Allow.'
          );
        } else if (event.error === 'audio-capture') {
          alert(
            'OneAI could not access the microphone. Check that another app is not using it.'
          );
        }

        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        console.log('OneAI voice recognition ended');
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      setVoiceText('');

      // Start only after Chrome confirms microphone access.
      // Give Chrome Android a moment after microphone permission is granted.
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      recognition.start();
    } catch (startErr) {
      console.error('Speech recognition start failed:', startErr);
      setIsVoiceListening(false);
      alert(
        'OneAI could not start voice recognition. Please tap the microphone again and make sure Chrome microphone access is allowed.'
      );
    }
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      setIsVoiceListening(false);

      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError'
      ) {
        alert(
          'Microphone access was denied. Open Chrome Site Settings for OneAI and set Microphone to Allow.'
        );
      } else if (err?.name === 'NotFoundError') {
        alert('No microphone was found on this device.');
      } else {
        alert(
          'OneAI could not access your microphone. Please check Chrome microphone permissions and try again.'
        );
      }
    }
  };

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
      const res = await fetch('/api/chat/generate', {
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
    const res = await fetch('/api/documents/upload', {
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
    await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Reminder handlers
  const handleAddReminder = (reminder: Reminder) => {
    setReminders((prev) => [reminder, ...prev]);
  };

  const handleUpdateReminder = async (updated: Reminder) => {
    setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    await fetch(`/api/reminders/${updated.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updated),
    });
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/reminders/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
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
                const res = await fetch('/api/reminders/parse-ai', {
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
