import React, { useState, useEffect } from 'react';
import { Database, HardDrive, RefreshCw, CheckCircle2, Table, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { DatabaseStatus, DatabaseTableData, UserPersona } from '../types/api';
import { fetchDatabaseStatus, fetchTableRows, seedDatabase } from '../api/client';

interface DatabasePageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ token, currentUser }) => {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('invoices');
  const [tableData, setTableData] = useState<DatabaseTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadStatus = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const status = await fetchDatabaseStatus(token);
      setDbStatus(status);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch database status');
    } finally {
      setLoading(false);
    }
  };

  const loadTable = async (table: string) => {
    if (!token) return;
    setSelectedTable(table);
    setTableLoading(true);
    setError(null);
    try {
      const data = await fetchTableRows(table, 50, token);
      setTableData(data);
    } catch (err: any) {
      setError(err.message || `Failed to fetch records for ${table}`);
    } finally {
      setTableLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!token || seeding) return;
    setSeeding(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await seedDatabase(token);
      setDbStatus(res.db);
      setSuccessMsg(res.message);
      await loadTable(selectedTable);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTable('invoices');
  }, [token]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Database className="w-6 h-6 mr-2 text-emerald-400" />
            Live Enterprise Database Storage
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real persisted storage engine on disk. All document chunks, ERP invoices, and security audit logs are stored here.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSeed}
            disabled={seeding || loading}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Seeding Database...' : 'Re-Seed / Verify Database'}
          </button>
          <button
            onClick={() => { loadStatus(); loadTable(selectedTable); }}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-900/60 bg-emerald-950/40 flex items-center space-x-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Database Metadata Cards */}
      {dbStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">Storage Engine</span>
            <div className="text-sm font-bold text-white flex items-center">
              <HardDrive className="w-4 h-4 text-sky-400 mr-1.5" />
              {dbStatus.engine}
            </div>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center pt-1">
              <CheckCircle2 className="w-3 h-3 mr-1" /> {dbStatus.status}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">Database File Path</span>
            <div className="text-xs font-mono text-slate-300 truncate" title={dbStatus.file_path}>
              {dbStatus.file_path}
            </div>
            <span className="text-[11px] text-slate-400">Persisted locally on host disk</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">Database Size</span>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {dbStatus.file_size_kb} KB
            </div>
            <span className="text-[11px] text-slate-400">{dbStatus.file_size_bytes.toLocaleString()} bytes</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
            <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">Safety Architecture</span>
            <div className="text-sm font-bold text-purple-300 flex items-center">
              <ShieldCheck className="w-4 h-4 text-purple-400 mr-1.5" />
              Read-Only Safe
            </div>
            <span className="text-[11px] text-slate-400">Zero mutating SQL endpoints exist</span>
          </div>
        </div>
      )}

      {/* Table Selector Pills */}
      {dbStatus && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
            <Table className="w-4 h-4 mr-1.5 text-emerald-400" />
            <span>Database Tables & Live Row Counts</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(dbStatus.tables).map(([tbl, count]) => {
              const isSelected = selectedTable === tbl;
              return (
                <button
                  key={tbl}
                  onClick={() => loadTable(tbl)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 ring-1 ring-sky-400'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span className="font-semibold">{tbl}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isSelected ? 'bg-sky-800 text-sky-200' : 'bg-slate-950 text-slate-400'
                  }`}>
                    {count} rows
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw Table Viewer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">
            Table: <strong className="text-white">{selectedTable}</strong> (showing up to 50 rows)
          </span>
          {tableLoading && (
            <span className="text-sky-400 flex items-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              Querying SQLite...
            </span>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-900/40">
          {tableData && tableData.rows.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  {Object.keys(tableData.rows[0]).map((col) => (
                    <th key={col} className="p-3 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {tableData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    {Object.values(row).map((val: any, cIdx) => (
                      <td key={cIdx} className="p-3 max-w-xs truncate text-slate-300" title={String(val)}>
                        {val === null || val === undefined ? (
                          <span className="text-slate-400 italic">null</span>
                        ) : typeof val === 'boolean' ? (
                          val ? 'true' : 'false'
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              {tableLoading ? 'Loading records...' : `No records found in table "${selectedTable}". Click "Re-Seed Database" above to populate.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
