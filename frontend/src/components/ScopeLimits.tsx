import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

interface ScopeLimitsProps {
  scopeLimits: string[];
}

export const ScopeLimits: React.FC<ScopeLimitsProps> = ({ scopeLimits }) => {
  if (!scopeLimits || scopeLimits.length === 0) return null;

  return (
    <div className="mt-3.5 rounded-xl border border-amber-800/40 bg-amber-950/20 p-3 text-xs space-y-1.5">
      <div className="flex items-center space-x-1.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
        <Lock className="w-3.5 h-3.5 text-amber-400" />
        <span>Access Scope Limitations</span>
      </div>

      <ul className="list-disc list-inside space-y-1 text-slate-300">
        {scopeLimits.map((limit, idx) => (
          <li key={idx} className="leading-relaxed">
            {limit}
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] text-amber-400/80 italic pt-0.5">
        Derived strictly in backend code from verified caller claims.
      </p>
    </div>
  );
};
