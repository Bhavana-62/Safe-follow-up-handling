import React, { useState } from 'react';
import { Send, Sparkles, CornerDownLeft } from 'lucide-react';

interface QuestionInputProps {
  onSend: (question: string, explicitFollowup?: boolean | null) => void;
  isLoading: boolean;
}

const SAMPLE_PROMPTS = [
  { label: 'E1 · Refund Policy', text: "What's our refund window for damaged goods?" },
  { label: 'E2 · Cross-System EMEA', text: "Why did EMEA revenue dip last week — is it connected to the checkout incidents?" },
  { label: 'E3 · APAC Invoices', text: "Show me the open invoices for our APAC suppliers." },
  { label: 'E5 · Row Limit (POs)', text: "List every open purchase order this year." },
  { label: 'E6 · Meridian Contract', text: "What's the current status of our agreement with Meridian?" },
  { label: 'Open Invoices SUP-001', text: "Show me the open invoices for SUP-001 in EMEA" },
  { label: 'Follow-up · Amount', text: "What was the amount of that?" },
  { label: 'Follow-up · Invoices', text: "Show me the invoices for that" },
];

export const QuestionInput: React.FC<QuestionInputProps> = ({ onSend, isLoading }) => {
  const [question, setQuestion] = useState('');
  const [forceFollowup, setForceFollowup] = useState<'auto' | 'followup' | 'root'>('auto');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    let flag: boolean | null = null;
    if (forceFollowup === 'followup') flag = true;
    if (forceFollowup === 'root') flag = false;

    onSend(question.trim(), flag);
    setQuestion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/60 p-4 space-y-3">
      {/* Sample Prompt Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 text-[11px] font-semibold shrink-0 mr-1 flex items-center">
          <Sparkles className="w-3 h-3 mr-1 text-sky-400" />
          Test Queries:
        </span>
        {SAMPLE_PROMPTS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setQuestion(sample.text)}
            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:border-slate-500 transition-colors"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative rounded-xl border border-slate-700 bg-slate-950/80 focus-within:border-sky-500/80 focus-within:ring-1 focus-within:ring-sky-500/30 transition-all">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question across authorized enterprise documents and systems... (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={isLoading}
            className="w-full bg-transparent px-3.5 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between px-3.5 pb-2.5 pt-1 text-xs border-t border-slate-800/60">
            {/* Follow-up mode selector */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="hidden sm:inline">Follow-up pass-through:</span>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setForceFollowup('auto')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors ${
                    forceFollowup === 'auto'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setForceFollowup('followup')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors ${
                    forceFollowup === 'followup'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Explicitly pass is_followup=true"
                >
                  Force Follow-up
                </button>
                <button
                  type="button"
                  onClick={() => setForceFollowup('root')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors ${
                    forceFollowup === 'root'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Explicitly pass is_followup=false"
                >
                  Force Standalone
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-sky-600/30"
            >
              <span>Ask Question</span>
              <CornerDownLeft className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
