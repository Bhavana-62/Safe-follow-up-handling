import React, { useState } from 'react';
import { Shield, Plus, Copy, Check, Lock, ShieldAlert, Clock, Database, Layers } from 'lucide-react';

interface SidebarProps {
  sessionId: string;
  onNewSession: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sessionId, onNewSession }) => {
  const [copied, setCopied] = useState(false);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-72 border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between p-4 h-full select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-2 pt-1">
          <div className="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Stage 1</div>
            <div className="text-sm font-bold text-slate-100">READ-ONLY AGENT</div>
          </div>
        </div>

        {/* Session Management Box */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/70 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-400">Current Session</span>
            <button
              onClick={onNewSession}
              className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" />
              New Session
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
            <span className="truncate mr-2 text-[11px]">{sessionId}</span>
            <button
              onClick={copySessionId}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              title="Copy session ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Critical Security Invariant Callout */}
          <div className="text-[11px] leading-relaxed text-slate-400 bg-sky-950/30 border border-sky-900/40 rounded-lg p-2.5">
            <p className="font-semibold text-sky-300 flex items-center mb-1">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-sky-400 inline" />
              Session Security Rule
            </p>
            <p className="text-[10.5px] text-slate-300">
              Session continuity does not change your access permissions. Your authenticated identity determines what data can be accessed on every turn.
            </p>
          </div>
        </div>

        {/* Architecture & Security Invariants */}
        <div className="space-y-2 px-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Security Controls
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start space-x-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-200">Read-Only by Design:</strong> Zero write capability; cannot modify records anywhere.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <Database className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-200">In-Query Entitlements:</strong> Entitlements filtered inside search, never post-filtered.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <Layers className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-200">No Context Carryover:</strong> Only the question rewrites; prior chunks are discarded.
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <Clock className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
              <span>
                <strong className="text-slate-200">2-Turn History Cap:</strong> Rewrite history capped strictly at the last two turns.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer System Badges */}
      <div className="pt-4 border-t border-slate-800/60 px-1 space-y-1 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Identity Verification</span>
          <span className="text-emerald-400 font-mono text-[10px]">RS256 JWT</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Search Engine</span>
          <span className="text-sky-400 font-mono text-[10px]">Hybrid + RRF</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Output Contract</span>
          <span className="text-purple-400 font-mono text-[10px]">7 Honesty Rules</span>
        </div>
      </div>
    </aside>
  );
};
