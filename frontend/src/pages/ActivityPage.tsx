import React, { useState, useEffect } from 'react';
import { History, RefreshCw, AlertCircle, Clock, ShieldCheck, ShieldAlert, CheckCircle, Database } from 'lucide-react';
import { AuditItem, UserPersona } from '../types/api';
import { fetchActivity } from '../api/client';

interface ActivityPageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ token, currentUser }) => {
  const [events, setEvents] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchActivity(token, 100)
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivity();
  }, [token, currentUser?.username]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'ACCESS_DENIED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/50">
            ACCESS_DENIED
          </span>
        );
      case 'ANSWER_SYNTHESIZED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
            ANSWER_SYNTHESIZED
          </span>
        );
      case 'QUERY_RECEIVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-400 border border-sky-800/50">
            QUERY_RECEIVED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <History className="w-6 h-6 mr-2 text-purple-400" />
            Security & Query Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real persisted records from the database table <code className="text-slate-300">audit_events</code>. Every query, scope check, and tool call is recorded.
          </p>
        </div>

        <button
          onClick={loadActivity}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Event</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Question / Target</th>
              <th className="p-3">Tools</th>
              <th className="p-3">Usage & Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 text-slate-400 whitespace-nowrap">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </td>
                <td className="p-3 whitespace-nowrap">{getEventBadge(ev.event_type)}</td>
                <td className="p-3 font-semibold text-sky-300">{ev.subject}</td>
                <td className="p-3 text-slate-200 max-w-xs truncate font-sans" title={ev.question || ''}>
                  {ev.question || '—'}
                </td>
                <td className="p-3 text-amber-300">{ev.tools_called || '—'}</td>
                <td className="p-3 text-slate-400 text-[10.5px]">
                  {ev.cost_usd > 0
                    ? `$${ev.cost_usd.toFixed(4)}`
                    : 'Cost: N/A (Local Model)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No audit events recorded yet. Run a query in the AI Workspace to generate real audit rows.
          </div>
        )}
      </div>
    </div>
  );
};
