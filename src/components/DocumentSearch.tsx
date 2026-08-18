import React, { useState } from 'react';
import { UploadedDocument, SearchQueryResponse } from '../types';
import { Search, Upload, FileText, Sparkles, Trash2, ArrowRight, CheckCircle2, Tag, BookOpen, Mic, AlertCircle, RefreshCw, Paperclip } from 'lucide-react';

interface DocumentSearchProps {
  documents: UploadedDocument[];
  authToken: string;
  onUploadDocument: (title: string, fileName: string, fileType: string, content: string) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  isVoiceListening: boolean;
  onToggleVoice: () => void;
  voiceText: string;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  documents,
  authToken,
  onUploadDocument,
  onDeleteDocument,
  isVoiceListening,
  onToggleVoice,
  voiceText,
}) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchQueryResponse | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states for upload
  const [docTitle, setDocTitle] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [uploading, setUploading] = useState(false);

  // Sync voice input
  React.useEffect(() => {
    if (voiceText) {
      setQuery((prev) => (prev ? `${prev} ${voiceText}` : voiceText));
    }
  }, [voiceText]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const res = await fetch('/api/documents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      setSearchResult(data);
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) {
      alert('Please enter document title and content');
      return;
    }

    setUploading(true);
    try {
      await onUploadDocument(
        docTitle,
        docFileName || `${docTitle.toLowerCase().replace(/\s+/g, '_')}.txt`,
        'text',
        docContent
      );
      setDocTitle('');
      setDocFileName('');
      setDocContent('');
      setShowUploadModal(false);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    // Browser-native text formats supported by OneAI.
    const supportedTypes = ['txt', 'md', 'csv', 'json'];

    if (!extension || !supportedTypes.includes(extension)) {
      alert(
        'This file type is not supported yet. Please upload a .txt, .md, .csv, or .json file.'
      );
      e.target.value = '';
      return;
    }

    setDocFileName(file.name);

    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;

      if (typeof text === 'string') {
        setDocContent(text);
      } else {
        alert('Unable to read this document.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read the selected document.');
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/40 sm:p-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span>AI-Powered Document Search & Knowledge Base</span>
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Upload text documents, roadmaps, policies & notes to query them using OneAI semantic reasoning.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* AI Search Bar */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your documents..."
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-medium text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onToggleVoice}
              className={`absolute right-2.5 top-2 rounded-lg p-1 transition ${
                isVoiceListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Dictate Query with Voice"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{searching ? 'Searching...' : 'AI Search'}</span>
          </button>
        </form>
      </div>

      {/* Search Result AI Panel */}
      {searchResult && (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-white p-5 shadow-lg dark:border-indigo-900 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
              <span>OneAI Synthesis Answer</span>
            </div>
            <span className="text-xs text-slate-400">Source Citations: {searchResult.sources.length}</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap dark:text-slate-100">
            {searchResult.answer}
          </p>

          {/* Sources breakdown */}
          {searchResult.sources.length > 0 && (
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Document Citations & Snippets</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {searchResult.sources.map((src, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{src.documentTitle}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                      "{src.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow ups */}
          {searchResult.suggestedFollowUps.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500">Suggested follow-up questions:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {searchResult.suggestedFollowUps.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(q);
                    }}
                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    👉 {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Library Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Document Library ({documents.length})
          </h3>
          <span className="text-xs text-slate-500">Stored securely per user session</span>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <FileText className="mx-auto h-10 w-10 text-slate-400" />
            <h4 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">No documents uploaded yet</h4>
            <p className="mt-1 text-xs text-slate-500">Upload roadmaps, text files, or meeting notes to unlock AI search.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              <span>Upload First Document</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="rounded-lg p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {doc.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                    {doc.summary || doc.content.slice(0, 120)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.tags?.map((t, idx) => (
                      <span key={idx} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-600" />
              <span>Upload Document to Knowledge Base</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Paste document text or select a text file (.txt, .md, .csv, .json). OneAI will automatically summarize and chunk it.
            </p>

            <form onSubmit={handleFileUpload} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Q3 Strategic AI Roadmap"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">File Attachment (Optional File Picker)</label>
                <input
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  onChange={handleFileDrop}
                  className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Document Text Content</label>
                <textarea
                  required
                  rows={10}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Paste raw text, notes, guidelines, or code here..."
                  className="mt-2 block w-full min-h-[240px] resize-y rounded-xl border-2 border-slate-400 bg-white p-4 text-base font-mono font-medium text-black placeholder:text-slate-500 caret-indigo-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  style={{
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    WebkitTextFillColor: '#000000',
                    caretColor: '#4f46e5',
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {uploading ? 'Processing with AI...' : 'Save & Process Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
