import React, { useEffect, useRef } from 'react';
import { Shield, Lock, FileSearch, ArrowRight, Database } from 'lucide-react';
import { ChatMessage } from '../types/api';
import { MessageItem } from './MessageItem';

interface ChatWindowProps {
  messages: ChatMessage[];
  sessionId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, sessionId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none overflow-y-auto">
        <div className="max-w-xl space-y-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">
              Secure Read-Only Enterprise Agent
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Query authorized corporate policies, ERP invoices, and telemetry metrics. Every claim is backed by traceable evidence citations, with zero ability to write or modify data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Safe by Construction</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Purely read-only tools. Cannot issue refunds, post invoices, or write data.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-400">
                <FileSearch className="w-3.5 h-3.5" />
                <span>Entitlement Filtered</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Entitlements filtered inside the search query. Restricted documents never reach context.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
                <Database className="w-3.5 h-3.5" />
                <span>Follow-up Security</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Follow-ups are rewritten to standalone queries. Prior chunks are never carried forward.
              </p>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 font-mono">
            <span>Active Session: </span>
            <span className="text-sky-400">{sessionId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-4xl mx-auto space-y-2">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} sessionId={sessionId} />
        ))}
      </div>
    </div>
  );
};
