import React, { useState } from 'react';
import { UploadedDocument, SearchQueryResponse } from '../types';
import { Search, Upload, FileText, Sparkles, Trash2, ArrowRight, CheckCircle2, Tag, BookOpen, Mic, AlertCircle, RefreshCw, Paperclip } from 'lucide-react';


const API_BASE_URL = 'https://oneai-app-export.onrender.com';
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
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerTitle, setReaderTitle] = useState('');
  const [readerFileName, setReaderFileName] = useState('');
  const [readerContent, setReaderContent] = useState('');
  const [readerQuestion, setReaderQuestion] = useState('');
  const [readerAnswer, setReaderAnswer] = useState('');
  const [readerAsking, setReaderAsking] = useState(false);
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

  const handleOpenReader = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReaderLoading(true);
    setReaderTitle(file.name.replace(/\.[^/.]+$/, ''));
    setReaderFileName(file.name);
    setReaderContent('');
    setReaderAnswer('');
    setReaderQuestion('');
    setReaderOpen(true);

    try {
      const extension = file.name.includes('.')
        ? file.name.split('.').pop()?.toLowerCase()
        : '';

      let text = '';

      // Plain text, source code, markup, configuration and data files.
      const textExtensions = new Set([
        'txt', 'text', 'md', 'markdown', 'csv', 'json',
        'ts', 'tsx', 'tss', 'js', 'jsx', 'mjs', 'cjs',
        'css', 'scss', 'sass', 'less',
        'html', 'htm', 'xml', 'svg',
        'yaml', 'yml', 'toml', 'ini', 'conf', 'config',
        'log', 'sql', 'graphql', 'gql',
        'sh', 'bash', 'zsh', 'bat', 'cmd',
        'java', 'kt', 'kts', 'c', 'h', 'cpp', 'hpp',
        'cs', 'go', 'rs', 'rb', 'php', 'swift',
        'dart', 'py', 'r', 'lua', 'pl',
        'vue', 'svelte', 'astro',
        'env', 'gitignore', 'dockerfile',
      ]);

      if (textExtensions.has(extension || '') ||
          file.type.startsWith('text/') ||
          !extension) {
        text = await file.text();

      } else if (extension === 'pdf') {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.mjs',
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjs.getDocument({
          data: arrayBuffer,
        }).promise;

        const pages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();

          const pageText = content.items
            .map((item: any) => item.str || '')
            .join(' ');

          pages.push(`Page ${pageNumber}\n${pageText}`);
        }

        text = pages.join('\n\n');

      } else if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.extractRawText({
          arrayBuffer,
        });

        text = result.value;

      } else if (extension === 'doc') {
        throw new Error(
          'Old Word .doc files cannot be reliably read directly in the browser. Please save it as .docx or PDF.'
        );

      } else if (extension === 'xls' || extension === 'xlsx') {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
        });

        const sheets: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          }) as unknown[][];

          const sheetText = rows
            .map((row) =>
              row
                .map((cell) => String(cell ?? ''))
                .join(' | ')
            )
            .join('\n');

          sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
        }

        text = sheets.join('\n\n');

      } else {
        // Last-resort text reader.
        // This allows many unknown/source-code extensions to be opened
        // instead of rejecting them simply because their extension is unknown.
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error(
          `The file "${file.name}" contains no readable text.`
        );
      }

      setReaderContent(text);

    } catch (error: any) {
      console.error('OneAI Reader error:', error);

      setReaderContent(
        `Unable to read "${file.name}".\n\n${error?.message || 'Unknown error'}`
      );
    } finally {
      setReaderLoading(false);
      e.target.value = '';
    }
  };

  const handleReaderAsk = async () => {
    if (!readerQuestion.trim() || !readerContent.trim()) return;

    setReaderAsking(true);
    setReaderAnswer('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `${readerQuestion}

CURRENT DOCUMENT:
${readerContent.slice(0, 120000)}

Answer the user's question specifically using the current document. If the answer is not present in the document, clearly say that.`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'OneAI could not answer the question');
      }

      setReaderAnswer(
        data.answer || 'OneAI could not find an answer in this document.'
      );
    } catch (error: any) {
      console.error('OneAI Reader question error:', error);
      setReaderAnswer(`Error: ${error.message || 'Unable to answer question'}`);
    } finally {
      setReaderAsking(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/search`, {
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

    const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase()
      : '';

    setDocFileName(file.name);

    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    try {
      let text = '';

      // Plain text, source code, markup, configuration and data files.
      const textExtensions = new Set([
        'txt', 'text', 'md', 'markdown', 'csv', 'json',
        'ts', 'tsx', 'tss', 'js', 'jsx', 'mjs', 'cjs',
        'css', 'scss', 'sass', 'less',
        'html', 'htm', 'xml', 'svg',
        'yaml', 'yml', 'toml', 'ini', 'conf', 'config',
        'log', 'sql', 'graphql', 'gql',
        'sh', 'bash', 'zsh', 'bat', 'cmd',
        'java', 'kt', 'kts', 'c', 'h', 'cpp', 'hpp',
        'cs', 'go', 'rs', 'rb', 'php', 'swift',
        'dart', 'py', 'r', 'lua', 'pl',
        'vue', 'svelte', 'astro',
        'env', 'gitignore', 'dockerfile'
      ]);

      if (
        textExtensions.has(extension || '') ||
        file.type.startsWith('text/') ||
        !extension
      ) {
        text = await file.text();

      } else if (extension === 'pdf') {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.mjs',
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjs.getDocument({
          data: arrayBuffer,
        }).promise;

        const pages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();

          const pageText = content.items
            .map((item: any) => item.str || '')
            .join(' ')
            .trim();

          // Normal PDF with selectable text.
          if (pageText.length > 30) {
            pages.push(`Page ${pageNumber}\n${pageText}`);
            continue;
          }

          // Scanned/photo PDF page: render it and run OCR.
          try {
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              pages.push(`Page ${pageNumber}\n[Unable to create canvas for OCR]`);
              continue;
            }

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({
              canvasContext: context,
              viewport,
            }).promise;

            const Tesseract = await import('tesseract.js');

            const ocrResult = await Tesseract.recognize(
              canvas,
              'eng',
              {
                logger: (message: any) => {
                  if (message?.status === 'recognizing text') {
                    console.log(
                      `OneAI OCR page ${pageNumber}: ${Math.round((message.progress || 0) * 100)}%`
                    );
                  }
                },
              }
            );

            const ocrText = ocrResult.data.text?.trim();

            pages.push(
              `Page ${pageNumber}\n${
                ocrText || '[No readable text detected by OCR]'
              }`
            );

            canvas.width = 1;
            canvas.height = 1;
          } catch (ocrError: any) {
            console.error(`OCR failed on PDF page ${pageNumber}:`, ocrError);

            pages.push(
              `Page ${pageNumber}\n[OCR could not read this scanned/image page: ${
                ocrError?.message || 'Unknown OCR error'
              }]`
            );
          }
        }

        text = pages.join('\n\n');

      } else if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.extractRawText({
          arrayBuffer,
        });

        text = result.value;

      } else if (extension === 'doc') {
        throw new Error(
          'Old Word .doc files cannot be reliably read directly in the browser. Please save it as .docx or PDF.'
        );

      } else if (extension === 'xls' || extension === 'xlsx') {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
        });

        const sheets: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          }) as unknown[][];

          const sheetText = rows
            .map((row) =>
              row
                .map((cell) => String(cell ?? ''))
                .join(' | ')
            )
            .join('\n');

          sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
        }

        text = sheets.join('\n\n');

      } else {
        // Last-resort reader for unknown/source-code extensions.
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error(
          'OneAI could not find readable text in this file.'
        );
      }

      setDocContent(text);

    } catch (error: any) {
      console.error('OneAI document parsing error:', error);

      alert(
        `Unable to read this document: ${
          error?.message || 'Unknown error'
        }`
      );

      setDocContent('');
    } finally {
      e.target.value = '';
    }
  };  return (
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
      {/* OneAI Document Reader */}
      <div className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                OneAI Document Reader
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Open a PDF, Word, Excel, text or data file and let OneAI read it with you.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700">
            <BookOpen className="h-4 w-4" />
            <span>Open Document</span>
            <input
              type="file"
              accept=".txt,.md,.markdown,.csv,.json,.ts,.tsx,.js,.jsx,.mjs,.cjs,.css,.scss,.sass,.less,.html,.htm,.xml,.svg,.yaml,.yml,.toml,.ini,.conf,.log,.sql,.graphql,.gql,.sh,.bash,.zsh,.bat,.cmd,.java,.kt,.kts,.c,.h,.cpp,.hpp,.cs,.go,.rs,.rb,.php,.swift,.dart,.py,.r,.lua,.pl,.vue,.svelte,.astro,.tss,.text,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleOpenReader}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Reader Modal */}
      {readerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4">
          <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

            {/* Reader Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                    OneAI Document Reader
                  </h2>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {readerFileName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReaderOpen(false)}
                className="ml-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Reader Body */}
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">

              {/* Document */}
              <div className="min-h-0 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/50 sm:p-6">
                {readerLoading ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      OneAI is reading your document...
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Extracting readable text from {readerFileName}
                    </p>
                  </div>
                ) : (
                  <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                    <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {readerTitle}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {readerContent.length.toLocaleString()} readable characters
                      </p>
                    </div>

                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800 dark:text-slate-200">
                      {readerContent}
                    </pre>
                  </article>
                )}
              </div>

              {/* OneAI Assistant */}
              <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:border-l lg:border-t-0">
                <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Ask OneAI
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Ask questions about the document you are currently reading.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {readerAnswer ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        OneAI
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">
                        {readerAnswer}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                      <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Your document is ready
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        Ask OneAI to summarize it, explain a section, find information, or answer a question.
                      </p>
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700">
                  <textarea
                    value={readerQuestion}
                    onChange={(e) => setReaderQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReaderAsk();
                      }
                    }}
                    rows={3}
                    placeholder="Ask about this document..."
                    className="w-full resize-none rounded-xl border-2 border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={handleReaderAsk}
                    disabled={readerAsking || !readerQuestion.trim() || !readerContent.trim()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {readerAsking ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        OneAI is thinking...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Ask OneAI
                      </>
                    )}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

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
                  accept=".txt,.md,.json,.csv,.pdf,.docx,.xls,.xlsx"
                  onChange={handleFileDrop}
                  className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Document Text Content
                </label>

                {docFileName && docContent && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                    <div className="flex items-center justify-between border-b border-indigo-100 bg-white px-3 py-2 dark:border-indigo-900/60 dark:bg-slate-900">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Preview: {docFileName}
                        </span>
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] text-slate-400">
                        {docContent.length.toLocaleString()} chars
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto bg-white p-4 dark:bg-slate-950">
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700 dark:text-slate-300">
                        {docContent}
                      </pre>
                    </div>

                    <div className="border-t border-indigo-100 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
                      ✓ OneAI successfully extracted readable content from this file.
                      Review it above before saving.
                    </div>
                  </div>
                )}

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
