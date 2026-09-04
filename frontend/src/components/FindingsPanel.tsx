import React from 'react';
import { Finding } from '../types/api';
import { EvidencePanel } from './EvidencePanel';
import { ShieldCheck } from 'lucide-react';

interface FindingsPanelProps {
  findings: Finding[];
}

export const FindingsPanel: React.FC<FindingsPanelProps> = ({ findings }) => {
  if (!findings || findings.length === 0) return null;

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
            Confidence: High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/50">
            Confidence: Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/50">
            Confidence: Low (Reported Note)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
        <ShieldCheck className="w-4 h-4 text-sky-400" />
        <span>Grounded Findings ({findings.length})</span>
      </div>

      <div className="space-y-3">
        {findings.map((finding, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Finding #{idx + 1}
              </span>
              {getConfidenceBadge(finding.confidence)}
            </div>

            <p className="text-sm font-medium text-slate-200 leading-snug">
              {finding.claim}
            </p>

            <EvidencePanel evidence={finding.evidence} />
          </div>
        ))}
      </div>
    </div>
  );
};
