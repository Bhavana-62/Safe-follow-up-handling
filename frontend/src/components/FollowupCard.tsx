import React from 'react';
import { RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

interface FollowupCardProps {
  isFollowup: boolean;
  rewrittenQuestion?: string | null;
  originalQuestion: string;
}

export const FollowupCard: React.FC<FollowupCardProps> = ({
  isFollowup,
  rewrittenQuestion,
  originalQuestion,
}) => {
  if (isFollowup && rewrittenQuestion) {
    return (
      <div className="mb-4 rounded-xl border border-sky-500/40 bg-sky-950/20 p-3.5 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold text-sky-400 mb-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-sky-400" />
          <span>Follow-up Detected · Context-Aware Rewrite</span>
        </div>
        <div className="text-xs text-slate-300">
          <p className="text-slate-400 mb-1">
            Your question was resolved into a standalone query before retrieval:
          </p>
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 font-medium text-sky-200 text-sm flex items-start space-x-2">
            <ArrowRight className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>&ldquo;{rewrittenQuestion}&rdquo;</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 italic">
            Evaluated against your current entitlements only. No previous turn evidence carried forward.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 inline-flex items-center space-x-1.5 text-[11px] font-medium text-slate-400 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-full">
      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      <span>Independent question · Direct retrieval</span>
    </div>
  );
};
