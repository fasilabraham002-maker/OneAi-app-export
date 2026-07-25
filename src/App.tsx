import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, UploadedDocument, Reminder } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { DocumentSearch } from './components/DocumentSearch';
import { SmartReminders } from './components/SmartReminders';
import { VoiceController } from './components/VoiceController';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>({
    id: 'demo-user-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@nexus.ai',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      autoTextToSpeech: false,
      voiceGender: 'female',
      reminderNotifications: true,
    },
  });
  const [authToken, setAuthToken] = useState<string>('user_demo-user-1');

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // App data state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      content: 'Hello Alex! Welcome to Nexus AI. How can I assist you with your chat, smart reminders, or document search today?',
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
  const toggleVoiceListening = () => {
    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. You can still use keyboard input.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceText(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsVoiceListening(false);
    }
  };

  // Chat message submit handler
  const handleSendMessage = async (text: string, attachedDocs: string[], systemInstruction?: string) => {
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      const aiMsg: ChatMessage = {
        id: `m-ai-${Date.now()}`,
        sender: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
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
    setUser(loggedUser);
    setAuthToken(token);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken('');
    setDocuments([]);
    setReminders([]);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 font-sans">
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
        <main className="flex-1 overflow-hidden">
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
            <div className="p-6">
              {user ? (
                <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-lg font-bold">User Account Settings</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage user security, password verification, and workspace sessions.</p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold">Name: {user.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Email: {user.email}</p>
                    <p className="text-xs text-slate-400 mt-1">User Token: {authToken}</p>
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      View Detailed Security Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-base font-bold">No active user account</h3>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Sign In or Create Account
                  </button>
                </div>
              )}
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
