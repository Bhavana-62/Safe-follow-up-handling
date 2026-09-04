import React from 'react';
import { User, Shield, AlertCircle } from 'lucide-react';
import { ChatMessage } from '../types/api';
import { FollowupCard } from './FollowupCard';
import { AnswerCard } from './AnswerCard';
import { FindingsPanel } from './FindingsPanel';
import { ScopeLimits } from './ScopeLimits';
import { ConsideredRejected } from './ConsideredRejected';
import { MissingSources } from './MissingSources';
import { TruncatedSources } from './TruncatedSources';
import { RequestDetails } from './RequestDetails';
import { LoadingState } from './LoadingState';

interface MessageItemProps {
  message: ChatMessage;
  sessionId: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, sessionId }) => {
  const { caller, question, timestamp, answer, isLoading, error } = message;

  return (
    <div className="space-y-4 py-4 border-b border-slate-800/60 last:border-0">
      {/* 1. User Question Header */}
      <div className="flex items-start justify-between space-x-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-sky-300 bg-sky-950/60 border border-sky-800/50">
              <User className="w-3 h-3 mr-1 text-sky-400" />
              {caller.username}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              [{caller.roles.join(', ')}]
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400 text-[11px]">{timestamp}</span>
          </div>

          <div className="text-base font-medium text-slate-100 pl-0.5">
            {question}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
            Turn #{message.turnNumber}
          </span>
        </div>
      </div>

      {/* 2. Loading State */}
      {isLoading && <LoadingState />}

      {/* 3. Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-start space-x-3 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-rose-300">Request Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 4. Agent Response Payload */}
      {answer && (
        <div className="pl-2 sm:pl-4 space-y-3">
          {/* Follow-up / Rewritten Question Card */}
          <FollowupCard
            isFollowup={answer.is_followup}
            rewrittenQuestion={answer.rewritten_question}
            originalQuestion={question}
          />

          {/* Primary Answer Summary Card */}
          <AnswerCard kind={answer.kind} summary={answer.summary} />

          {/* Findings with Grounded Citations */}
          <FindingsPanel findings={answer.findings} />

          {/* Scope Limitations */}
          <ScopeLimits scopeLimits={answer.scope_limits} />

          {/* Missing Sources (Declines) */}
          <MissingSources missingSources={answer.missing_sources} />

          {/* Truncated Sources (Row Limits) */}
          <TruncatedSources truncatedSources={answer.truncated_sources} />

          {/* Considered but Rejected Hypotheses */}
          <ConsideredRejected items={answer.considered_and_rejected} />

          {/* Request Metadata Details */}
          <RequestDetails
            turnId={message.id}
            sessionId={sessionId}
            isFollowup={answer.is_followup}
            callerUsername={caller.username}
            timestamp={timestamp}
          />
        </div>
      )}
    </div>
  );
};
