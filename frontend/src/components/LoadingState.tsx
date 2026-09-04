import React, { useState, useEffect } from 'react';
import { Loader2, Search, Shield, Database, Sparkles } from 'lucide-react';

export const LoadingState: React.FC = () => {
  const [stage, setStage] = useState(0);

  const stages = [
    { icon: Search, text: 'Resolving follow-up references and rewrites...' },
    { icon: Shield, text: 'Verifying caller claims & pre-filtering entitlements...' },
    { icon: Database, text: 'Executing concurrent typed reads & hybrid search...' },
    { icon: Sparkles, text: 'Synthesizing response against 7 Output Contract rules...' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(timer);
  }, [stages.length]);

  const CurrentIcon = stages[stage].icon;

  return (
    <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-5 space-y-3">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-200">
          Agent Processing Read-Only Pipeline
        </span>
      </div>

      <div className="space-y-2 pt-1 font-mono text-xs">
        {stages.map((s, idx) => {
          const Icon = s.icon;
          const isCurrent = idx === stage;
          const isDone = idx < stage;
          return (
            <div
              key={idx}
              className={`flex items-center space-x-2 transition-colors ${
                isCurrent
                  ? 'text-sky-300 font-semibold'
                  : isDone
                  ? 'text-slate-400'
                  : 'text-slate-400'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-pulse text-sky-400' : isDone ? 'text-emerald-400' : ''}`} />
              <span>{s.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
