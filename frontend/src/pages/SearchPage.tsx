import React, { useState } from 'react';
import { Search, FileText, Database, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { SearchResult, UserPersona } from '../types/api';
import { searchEnterprise } from '../api/client';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

interface SearchPageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

export const SearchPage: React.FC<SearchPageProps> = ({ token, currentUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !token || loading) return;

    setLoading(true);
    setError(null);
    searchEnterprise(query.trim(), token)
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
          <Search className="w-6 h-6 mr-2 text-amber-400" />
          Global Enterprise Search
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          In-database entitlement-filtered keyword search across authorized documents, invoices, and incidents.
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search authorized knowledge and enterprise records (e.g., 'refund', 'SUP-001', 'checkout')..."
          className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-4 pr-24 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 space-x-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Searching authorized records...</span>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <div className="text-xs text-slate-400">
            Found {results.total_matches} authorized matches for &ldquo;{results.query}&rdquo;
          </div>

          {/* Document Matches */}
          {results.documents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                <span>Authorized Documents ({results.documents.length})</span>
              </h3>
              <div className="space-y-2">
                {results.documents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDocId(d.id)}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{d.title}</span>
                      <span className="font-mono text-[11px] text-sky-400">{d.id}</span>
                    </div>
                    <p className="text-xs text-slate-400">{d.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Matches */}
          {results.invoices.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center">
                <Database className="w-3.5 h-3.5 mr-1.5" />
                <span>ERP Invoices ({results.invoices.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1"
                  >
                    <div className="text-xs font-bold text-sky-300 font-mono">{inv.title}</div>
                    <div className="text-xs text-slate-300 font-mono">{inv.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incident Matches */}
          {results.incidents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                <span>Observability Outages ({results.incidents.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1"
                  >
                    <div className="text-xs font-bold text-rose-300 font-mono">{inc.title}</div>
                    <div className="text-xs text-slate-400 text-[11px]">{inc.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.total_matches === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              No matching authorized documents or records found.
            </div>
          )}
        </div>
      )}

      <DocumentViewerModal
        docId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        token={token}
      />
    </div>
  );
};
