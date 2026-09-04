import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, XCircle } from 'lucide-react';

interface ConsideredRejectedProps {
  items: string[];
}

export const ConsideredRejected: React.FC<ConsideredRejectedProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-3 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition-colors"
      >
        <span className="flex items-center space-x-2">
          <Search className="w-3.5 h-3.5 text-purple-400" />
          <span>Considered but Rejected Hypotheses ({items.length})</span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-2 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-300">
          <p className="text-[11px] text-slate-400 mb-2">
            The following coincidental or alternative explanations were examined against live records and dismissed:
          </p>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-start space-x-2"
            >
              <XCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed text-slate-200">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
