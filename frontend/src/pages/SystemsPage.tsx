import React, { useState, useEffect } from 'react';
import { Server, Shield, CheckCircle2, Lock, ArrowRight, Database } from 'lucide-react';
import { SystemItem, UserPersona } from '../types/api';
import { fetchSystems } from '../api/client';

interface SystemsPageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

export const SystemsPage: React.FC<SystemsPageProps> = ({ token, currentUser }) => {
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchSystems(token)
      .then(setSystems)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
          <Server className="w-6 h-6 mr-2 text-sky-400" />
          Connected Read-Only Systems
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Audited metadata and registered capability registry for connected enterprise systems.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systems.map((sys) => (
          <div
            key={sys.id}
            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center">
                  {sys.name}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">System ID: {sys.id}</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {sys.status}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider mb-1">
                  Exposed Read-Only Tools:
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {sys.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-semibold">Access Requirements</span>
                  <span className="text-amber-300 font-mono">[{sys.required_roles.join(', ')}]</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Execution Mode</span>
                  <span className="text-purple-300 flex items-center font-medium">
                    <Lock className="w-3 h-3 mr-1 text-purple-400" />
                    {sys.mode}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Safety Guarantee: </span>
                <span>{sys.safety_guarantee}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
