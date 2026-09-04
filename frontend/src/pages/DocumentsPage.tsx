import React, { useState, useEffect } from 'react';
import { FileText, Search, Shield, Eye, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { DocumentItem, UserPersona } from '../types/api';
import { fetchDocuments } from '../api/client';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

interface DocumentsPageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ token, currentUser }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const loadDocs = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchDocuments(token)
      .then((data) => setDocuments(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocs();
  }, [token, currentUser?.username]);

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.doc_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <FileText className="w-6 h-6 mr-2 text-sky-400" />
            Authorized Enterprise Documents
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Documents retrieved strictly according to your verified entitlement tags ({currentUser?.username}).
          </p>
        </div>

        <button
          onClick={loadDocs}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Security Gating Callout */}
      <div className="p-3.5 rounded-xl border border-sky-900/40 bg-sky-950/20 text-xs text-slate-300 flex items-start space-x-2.5">
        <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-sky-300">In-Database Entitlement Pre-Filter Active: </span>
          <span>
            The database only returns documents that match your claims. Documents outside your scope (e.g. legal or finance restrictions) are completely excluded from the query results.
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter authorized documents by title or path..."
          className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Documents Grid / Table */}
      <div className="space-y-3">
        {filteredDocs.map((doc) => (
          <div
            key={doc.doc_id}
            className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-white hover:text-sky-300 transition-colors">
                  {doc.title}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    doc.trusted
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                  }`}
                >
                  {doc.trusted ? 'Official' : 'Untrusted Memo'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-slate-300">{doc.doc_id}</span>
                <span>•</span>
                <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-sky-300">[{doc.entitlements.join(', ')}]</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDocId(doc.doc_id)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 transition-colors shrink-0"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Open & AI Actions
            </button>
          </div>
        ))}

        {!loading && filteredDocs.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            No authorized documents found matching your filter or entitlements.
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        docId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        token={token}
      />
    </div>
  );
};
