import React, { useState, useEffect } from 'react';
import { X, FileText, Sparkles, BookOpen, ShieldCheck, AlertCircle, Loader2, Bot, HelpCircle } from 'lucide-react';
import { DocumentDetail, Answer } from '../types/api';
import { fetchDocumentDetail, executeDocumentAction } from '../api/client';
import { AnswerCard } from './AnswerCard';
import { FindingsPanel } from './FindingsPanel';

interface DocumentViewerModalProps {
  docId: string | null;
  onClose: () => void;
  token: string | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ docId, onClose, token }) => {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Answer | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');

  useEffect(() => {
    if (!docId || !token) return;
    setLoading(true);
    setError(null);
    setAiResult(null);
    setAiError(null);

    fetchDocumentDetail(docId, token)
      .then((data) => setDoc(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [docId, token]);

  const handleAction = async (action: 'summarize' | 'explain' | 'ask', q?: string) => {
    if (!docId || !token) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const ans = await executeDocumentAction(docId, action, token, q);
      setAiResult(ans);
    } catch (err: any) {
      setAiError(err.message || 'AI action failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (!docId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                {doc?.title || docId}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">{docId}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span>Loading document from persistent store...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {doc && (
            <>
              {/* Document Metadata Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400">Entitlements:</span>
                <span className="text-sky-300 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded">
                  [{doc.entitlements.join(', ')}]
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">Updated:</span>
                <span className="text-slate-200">{new Date(doc.updated_at).toLocaleDateString()}</span>
                <span className="text-slate-400">•</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  doc.trusted ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-rose-950/80 text-rose-400 border border-rose-700/50'
                }`}>
                  {doc.trusted ? 'Verified Official' : 'External Untrusted Memo'}
                </span>
              </div>

              {/* AI Actions Section */}
              <div className="p-4 rounded-xl border border-sky-900/40 bg-sky-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Real RAG Document AI Actions</span>
                  </div>
                  {aiLoading && (
                    <span className="text-xs text-sky-300 flex items-center">
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Executing Pipeline...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction('summarize')}
                    disabled={aiLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-200 bg-sky-900/40 hover:bg-sky-900/70 border border-sky-700/50 disabled:opacity-50 transition-colors"
                  >
                    Summarize Provisions
                  </button>
                  <button
                    onClick={() => handleAction('explain')}
                    disabled={aiLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 transition-colors"
                  >
                    Explain Policy & Rules
                  </button>
                </div>

                {/* Custom Question input */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ask a question about this specific document..."
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleAction('ask', customQuestion)}
                    disabled={aiLoading || !customQuestion.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 transition-colors"
                  >
                    Ask
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 rounded-lg border border-rose-900/60 bg-rose-950/40 text-xs text-rose-300">
                    {aiError}
                  </div>
                )}

                {aiResult && (
                  <div className="mt-3 pt-3 border-t border-sky-900/50 space-y-3">
                    <AnswerCard kind={aiResult.kind} summary={aiResult.summary} />
                    <FindingsPanel findings={aiResult.findings} />
                  </div>
                )}
              </div>

              {/* Full Document Content */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
                  <BookOpen className="w-4 h-4 mr-1.5 text-sky-400" />
                  <span>Document Text Content</span>
                </h3>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-text">
                  {doc.content}
                </div>
              </div>

              {/* Chunks Breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Structural Retrieval Chunks ({doc.chunks.length})
                </h3>
                <div className="space-y-2">
                  {doc.chunks.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-sky-300 font-mono text-[11px]">
                        <span>Locator: {c.locator}</span>
                        <span className="text-slate-400">{new Date(c.updated_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 font-sans">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
