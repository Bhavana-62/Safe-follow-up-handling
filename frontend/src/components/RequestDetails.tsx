import React, { useState } from 'react';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

interface RequestDetailsProps {
  turnId: string;
  sessionId: string;
  isFollowup: boolean;
  callerUsername: string;
  timestamp: string;
}

export const RequestDetails: React.FC<RequestDetailsProps> = ({
  turnId,
  sessionId,
  isFollowup,
  callerUsername,
  timestamp,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-slate-800/60 pt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-300 transition-colors"
      >
        <Info className="w-3 h-3" />
        <span>Request Metadata</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="mt-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Caller Identity</span>
            <span className="text-slate-200">{callerUsername}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Session ID</span>
            <span className="text-slate-200 truncate block" title={sessionId}>{sessionId}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Follow-up Turn</span>
            <span className={isFollowup ? "text-sky-400" : "text-slate-400"}>
              {isFollowup ? "Yes (Resolved)" : "No (Root)"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">History Window</span>
            <span className="text-slate-200">≤ 2 turns (Capped)</span>
          </div>
        </div>
      )}
    </div>
  );
};
