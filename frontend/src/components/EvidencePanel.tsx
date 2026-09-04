import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FileText, Calendar, Clock, Compass } from 'lucide-react';
import { EvidenceRef } from '../types/api';

interface EvidencePanelProps {
  evidence: EvidenceRef[];
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="mt-2.5 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition-colors"
      >
        <span className="flex items-center space-x-1.5">
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Grounded Evidence Citations ({evidence.length})</span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 border-t border-slate-800/80 bg-slate-950/70">
          {evidence.map((ref, idx) => (
            <div
              key={`${ref.source}-${ref.locator}-${idx}`}
              className="p-2.5 rounded-md border border-slate-800 bg-slate-900/60 text-xs space-y-1.5 font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="text-sky-300 font-medium flex items-center">
                  <FileText className="w-3 h-3 mr-1 text-sky-400" />
                  {ref.source}
                </span>
                <span className="text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded text-[10px]">
                  {ref.locator}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-0.5">
                {ref.as_of && (
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                    As of: {new Date(ref.as_of).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-slate-400" />
                  Retrieved: {new Date(ref.retrieved_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
