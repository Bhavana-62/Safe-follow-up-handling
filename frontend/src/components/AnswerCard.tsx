import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Bot } from 'lucide-react';

interface AnswerCardProps {
  kind: 'answered' | 'partial' | 'declined';
  summary: string;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({ kind, summary }) => {
  const getBadge = () => {
    switch (kind) {
      case 'answered':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-600/40">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Answer Available
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-600/40">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Partial Answer · Row Limit Reached
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-600/40">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />
            Unable to Answer · Evidence Insufficient / Scope Restricted
          </span>
        );
    }
  };

  const getBorderColor = () => {
    switch (kind) {
      case 'answered':
        return 'border-slate-800 bg-slate-900/60';
      case 'partial':
        return 'border-amber-900/50 bg-amber-950/10';
      case 'declined':
        return 'border-rose-900/50 bg-rose-950/10';
    }
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${getBorderColor()}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Agent Response</span>
        </div>
        {getBadge()}
      </div>

      <div className="text-sm font-normal text-slate-100 leading-relaxed">
        {summary}
      </div>
    </div>
  );
};
