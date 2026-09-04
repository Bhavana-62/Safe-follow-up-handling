import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TruncatedSourcesProps {
  truncatedSources: string[];
}

export const TruncatedSources: React.FC<TruncatedSourcesProps> = ({ truncatedSources }) => {
  if (!truncatedSources || truncatedSources.length === 0) return null;

  return (
    <div className="mt-3.5 rounded-xl border border-amber-800/40 bg-amber-950/20 p-3.5 text-xs space-y-1.5">
      <div className="flex items-center space-x-1.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span>Configured Row Limits Hit (Partial Result)</span>
      </div>

      <p className="text-slate-300">
        To prevent unbounded reads and protect latency, results were truncated to the tool row limit:
      </p>

      <ul className="list-disc list-inside space-y-1 text-amber-200/90 font-mono text-[11px]">
        {truncatedSources.map((src, idx) => (
          <li key={idx}>{src}</li>
        ))}
      </ul>
      <p className="text-[10.5px] text-slate-400 italic">
        Reported figures represent totals of the returned subset, never the full universe.
      </p>
    </div>
  );
};
