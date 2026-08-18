import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UploadedDocument } from '../types';
import { Send, Bot, User as UserIcon, Mic, Volume2, VolumeX, Sparkles, FileText, Check, Paperclip, RefreshCw, Layers } from 'lucide-react';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachedDocs: string[], systemInstruction?: string) => Promise<void>;
  documents: UploadedDocument[];
  isVoiceListening: boolean;
  onToggleVoice: () => void;
  voiceText: string;
  loading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  documents,
  isVoiceListening,
  onToggleVoice,
  voiceText,
  loading,
}) => {
  const [input, setInput] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are OneAI, an intelligent workspace assistant skilled in concise answers, document analysis, and actionable advice.'
  );
  const [showDocSelector, setShowDocSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Sync voice dictation input without duplicating transcripts.
  useEffect(() => {
    if (voiceText.trim()) {
      setInput(voiceText);
    }
  }, [voiceText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const currentText = input;
    const currentDocs = [...selectedDocIds];
    setInput('');
    setSelectedDocIds([]);
    setShowDocSelector(false);

    await onSendMessage(currentText, currentDocs, systemInstruction);
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const voicesNotReady = (synth: SpeechSynthesis) => {
    return synth.getVoices().length === 0;
  };

  // Warm up Android Chrome's speech engine early.
  // This prevents the first real speech from waiting for voice initialization.
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    synth.getVoices();

    const warmupVoice = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;

      try {
        synth.cancel();

        const warmup = new SpeechSynthesisUtterance("");
        warmup.volume = 0;
        warmup.rate = 1;
        warmup.pitch = 1;
        warmup.voice =
          voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
          voices[0];

        synth.speak(warmup);

        window.setTimeout(() => {
          synth.cancel();
        }, 50);
      } catch (error) {
        console.warn("OneAI TTS warmup failed:", error);
      }
    };

    warmupVoice();

    if (voicesNotReady(synth)) {
      synth.addEventListener("voiceschanged", warmupVoice, { once: true });
    }

    return () => {
      synth.cancel();
    };
  }, []);

  const handleSpeakText = (msgId: string, text: string) => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    const synth = window.speechSynthesis;

    // Stop the current speech immediately when the same message is tapped.
    if (speakingMessageId === msgId) {
      synth.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Cancel anything already queued.
    synth.cancel();

    // Keep the text clean and avoid an unnecessarily large utterance.
    const cleanText = text.trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Responsive settings for Android Chrome.
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Use an already available voice when possible.
    const voices = synth.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
      voices.find((voice) => voice.default);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.onstart = () => {
      console.log("OneAI TTS started");
      setSpeakingMessageId(msgId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = (event) => {
      console.warn("OneAI TTS error:", event.error);
      setSpeakingMessageId(null);
    };

    // Start immediately.
    setSpeakingMessageId(msgId);
    console.log("OneAI TTS speak() called:", new Date().toISOString());
    synth.speak(utterance);

    // Android Chrome sometimes pauses newly queued speech.
    window.setTimeout(() => {
      if (synth.speaking && synth.paused) {
        synth.resume();
      }
    }, 100);
  };

  const samplePrompts = [
    'Analyze my Q3 AI Roadmap document and highlight top metrics',
    'Draft a 3-step action plan to prepare for our security compliance audit',
    'Summarize key remote work security guidelines from uploaded files',
    'Help me structure a daily productive work schedule for tomorrow',
  ];

  return (
    <div className="flex h-full flex-col bg-slate-900/40">
      {/* Top Config Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-900/80 px-4 py-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">System Mode:</span>
          <select
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="You are OneAI, an intelligent workspace assistant skilled in concise answers, document analysis, and actionable advice.">
              Workspace Assistant (Balanced)
            </option>
            <option value="You are a strict technical lead and software architect. Provide highly detailed, robust, and technical explanations.">
              Technical & Architecture Lead
            </option>
            <option value="You are an executive assistant. Keep responses ultra-concise, using bullet points, key metrics, and direct action items.">
              Executive Summarizer (Concise)
            </option>
            <option value="You are a creative strategist. Provide creative brainstorming, storytelling, and strategic frameworks.">
              Creative Strategist
            </option>
          </select>
        </div>

        {/* Selected Attached Documents Status */}
        <div className="flex items-center gap-2">
          {selectedDocIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Paperclip className="h-3 w-3" />
              {selectedDocIds.length} doc{selectedDocIds.length > 1 ? 's' : ''} attached
            </span>
          )}
          <button
            onClick={() => setShowDocSelector(!showDocSelector)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-500" />
            <span>Attach Context Document</span>
          </button>
        </div>
      </div>

      {/* Document Selector Drawer */}
      {showDocSelector && (
        <div className="border-b border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-950 dark:bg-slate-900">
          <div className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            Select Documents to Supply as Context to OneAI:
          </div>
          {documents.length === 0 ? (
            <p className="text-xs text-slate-500">No documents uploaded yet. Go to Document Search tab to upload files.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDocumentSelection(doc.id)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{doc.title}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Message History Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="mx-auto my-12 max-w-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              OneAI Workspace Assistant
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Powered by OneAI. Ask questions, analyze documents, or dictate requests.
            </p>

            <div className="mt-6 grid gap-2 text-left">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-900 transition dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
                >
                  ✨ "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSpeaking = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${
                    isUser
                      ? 'bg-indigo-600'
                      : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 shadow-sm'
                  }`}
                >
                  {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[85%] sm:max-w-[75%]`}>
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-100 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Source Documents Tags */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-700">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Context Sources:</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {msg.sources.map((src, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            >
                              <FileText className="h-3 w-3" />
                              {src.documentTitle}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar under response */}
                  {!isUser && (
                    <div className="mt-1 flex items-center gap-2 px-1">
                      <button
                        onClick={() => handleSpeakText(msg.id, msg.content)}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                          isSpeaking
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {isSpeaking ? <VolumeX className="h-3.5 w-3.5 animate-pulse" /> : <Volume2 className="h-3.5 w-3.5" />}
                        <span>{isSpeaking ? 'Stop Speaking' : 'Read Aloud'}</span>
                      </button>
                      <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>OneAI is reasoning...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Controls */}
      <div className="border-t border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Voice Dictation Button */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
              isVoiceListening
                ? 'border-red-400 bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title={isVoiceListening ? 'Stop Voice Input' : 'Dictate with Voice'}
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Input Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isVoiceListening ? 'Listening to voice dictation...' : 'Ask OneAI anything, dictate notes, or analyze attached docs...'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
