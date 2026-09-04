import React, { useEffect, useState } from 'react';
import {
  FileText,
  Database,
  Globe,
  ShieldCheck,
  Bot,
  Search,
  Lock,
  ArrowUpRight,
  Activity,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { OverviewMetrics, UserPersona } from '../types/api';
import { fetchOverview } from '../api/client';
import { NavTab } from '../components/Navigation';

interface OverviewPageProps {
  token: string | null;
  currentUser: UserPersona | null;
  onNavigate: (tab: NavTab) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ token, currentUser, onNavigate }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchOverview(token)
      .then((data) => setMetrics(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, currentUser?.username]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/50">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-sky-400" />
          <span>Verified Enterprise Workspace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Welcome, {currentUser?.username || 'Enterprise User'}
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Here is your live, access-controlled intelligence dashboard. All documents, structured records, and AI actions are evaluated strictly against your verified claims before retrieval.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Authorized Docs */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Authorized Docs</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {loading ? '...' : metrics?.authorized_documents ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            Filtered in database by your identity entitlements.
          </p>
          <button
            onClick={() => onNavigate('documents')}
            className="inline-flex items-center text-xs font-medium text-sky-400 hover:text-sky-300 pt-1"
          >
            <span>Explore Documents</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {/* Card 2: Regional Reach */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Permitted Regions</span>
            <Globe className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300 font-mono pt-1">
            {loading ? '...' : metrics?.available_regions.join(', ') || 'None'}
          </div>
          <p className="text-[11px] text-slate-400">
            Enforced in SQL queries before any record retrieval.
          </p>
          <button
            onClick={() => onNavigate('permissions')}
            className="inline-flex items-center text-xs font-medium text-amber-400 hover:text-amber-300 pt-1"
          >
            <span>Inspect Access Scope</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {/* Card 3: Active Systems */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Connected Systems</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">4</div>
          <p className="text-[11px] text-slate-400">
            ERP, Observability, CRM, Document Knowledge Store.
          </p>
          <button
            onClick={() => onNavigate('systems')}
            className="inline-flex items-center text-xs font-medium text-emerald-400 hover:text-emerald-300 pt-1"
          >
            <span>View Safe Metadata</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {/* Card 4: Safety Invariant */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Read-Only Safety</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 pt-1">100% Guaranteed</div>
          <p className="text-[11px] text-slate-400">
            Safe by construction. No database write endpoints exist.
          </p>
          <button
            onClick={() => onNavigate('activity')}
            className="inline-flex items-center text-xs font-medium text-purple-400 hover:text-purple-300 pt-1"
          >
            <span>View Audit Trail</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Core Platform Workspaces
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('workspace')}
            className="text-left p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/60 to-slate-950 p-5 space-y-2 hover:border-sky-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition-colors">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors">
              AI Intelligence Workspace
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask questions across corporate systems. Automatic follow-up rewriting, grounded citations, and zero cross-turn leakage.
            </p>
          </button>

          <button
            onClick={() => onNavigate('search')}
            className="text-left p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/60 to-slate-950 p-5 space-y-2 hover:border-amber-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors">
              Global Enterprise Search
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real search across authorized policies, invoices, and incidents with pre-retrieval entitlement gating.
            </p>
          </button>

          <button
            onClick={() => onNavigate('data')}
            className="text-left p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/60 to-slate-950 p-5 space-y-2 hover:border-emerald-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Structured Data Explorer
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Browse live ERP invoices, purchase orders, and telemetry outages directly from the persisted database.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
