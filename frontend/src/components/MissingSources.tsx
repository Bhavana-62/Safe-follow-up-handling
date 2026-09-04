import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MissingSourcesProps {
  missingSources: string[];
}

export const MissingSources: React.FC<MissingSourcesProps> = ({ missingSources }) => {
  if (!missingSources || missingSources.length === 0) return null;

  return (
    <div className="mt-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-xs space-y-2">
      <div className="flex items-center space-x-1.5 text-rose-300 font-bold uppercase tracking-wider text-[11px]">
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        <span>Missing Sources (Honest Decline)</span>
      </div>

      <p className="text-slate-300 text-xs">
        The agent declined to speculate. To answer this query, the following systems or permissions would be required:
      </p>

      <ul className="list-disc list-inside space-y-1 text-rose-200/90 font-mono text-[11px]">
        {missingSources.map((source, idx) => (
          <li key={idx} className="leading-relaxed">
            {source}
          </li>
        ))}
      </ul>
    </div>
  );
};
