import React, { useState, useEffect } from 'react';
import { Database, Filter, RefreshCw, AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import { InvoiceItem, PurchaseOrderItem, IncidentItem, UserPersona } from '../types/api';
import { fetchInvoices, fetchPurchaseOrders, fetchIncidents } from '../api/client';

interface EnterpriseDataPageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

type DataType = 'invoices' | 'pos' | 'incidents';

export const EnterpriseDataPage: React.FC<EnterpriseDataPageProps> = ({ token, currentUser }) => {
  const [activeType, setActiveType] = useState<DataType>('invoices');
  const [regionFilter, setRegionFilter] = useState<string>('');

  const [invoices, setInvoices] = useState<{ items: InvoiceItem[]; total: number }>({ items: [], total: 0 });
  const [pos, setPos] = useState<{ items: PurchaseOrderItem[]; total: number }>({ items: [], total: 0 });
  const [incidents, setIncidents] = useState<{ items: IncidentItem[]; total: number }>({ items: [], total: 0 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const rParam = regionFilter || undefined;

    if (activeType === 'invoices') {
      fetchInvoices(token, { region: rParam, limit: 50 })
        .then(setInvoices)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (activeType === 'pos') {
      fetchPurchaseOrders(token, { region: rParam, limit: 50 })
        .then(setPos)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      fetchIncidents(token, { region: rParam, limit: 50 })
        .then(setIncidents)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [token, activeType, regionFilter, currentUser?.username]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Database className="w-6 h-6 mr-2 text-emerald-400" />
            Structured Enterprise Records
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Direct read-only inspection of persisted database tables with in-query role & regional access enforcement.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveType('invoices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeType === 'invoices'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ERP Invoices (Finance)
          </button>
          <button
            onClick={() => setActiveType('pos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeType === 'pos'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Purchase Orders (Procurement)
          </button>
          <button
            onClick={() => setActiveType('incidents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeType === 'incidents'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Observability Incidents (Ops)
          </button>
        </div>

        {/* Region Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Permitted Regions</option>
            <option value="EMEA">EMEA</option>
            <option value="NA">NA</option>
            <option value="APAC">APAC (Restricted)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoices Table */}
      {activeType === 'invoices' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing {invoices.items.length} of {invoices.total} accessible invoices</span>
            <span className="font-mono text-sky-400">Required Role: [finance]</span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="p-3">Invoice ID</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Issued Date</th>
                  <th className="p-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {invoices.items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-sky-300">{inv.id}</td>
                    <td className="p-3 text-slate-300">{inv.supplier_id}</td>
                    <td className="p-3 text-white font-semibold">{inv.currency} {inv.amount.toLocaleString()}</td>
                    <td className="p-3 text-amber-300">{inv.region}</td>
                    <td className="p-3 text-slate-400">{inv.issued_at}</td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        {inv.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.items.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400 text-xs">
                {currentUser?.roles.includes('finance')
                  ? 'No invoices found for selected region filter.'
                  : 'Access Restricted: You do not hold the "finance" role required to query ERP open invoices.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Orders Table */}
      {activeType === 'pos' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing {pos.items.length} of {pos.total} accessible purchase orders</span>
            <span className="font-mono text-sky-400">Required Role: [procurement]</span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {pos.items.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-sky-300">{po.id}</td>
                    <td className="p-3 text-slate-300">{po.supplier_id}</td>
                    <td className="p-3 text-white font-semibold">{po.currency} {po.amount.toLocaleString()}</td>
                    <td className="p-3 text-amber-300">{po.region}</td>
                    <td className="p-3 text-slate-400">{po.issued_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pos.items.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400 text-xs">
                {currentUser?.roles.includes('procurement')
                  ? 'No purchase orders found for selected region filter.'
                  : 'Access Restricted: You do not hold the "procurement" role required to query purchase orders.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incidents Table */}
      {activeType === 'incidents' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing {incidents.items.length} of {incidents.total} accessible incidents</span>
            <span className="font-mono text-sky-400">Scope: Region-Gated</span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="p-3">Incident #</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Region</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Occurred At</th>
                  <th className="p-3">Resolved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {incidents.items.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-rose-300">{inc.incident_number}</td>
                    <td className="p-3 text-slate-200 font-sans font-medium">{inc.title}</td>
                    <td className="p-3 text-amber-300">{inc.region}</td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        inc.severity === 'P1' ? 'bg-rose-950 text-rose-400 border border-rose-800/40' : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{inc.occurred_at.slice(0, 16)}</td>
                    <td className="p-3 text-slate-400">{inc.resolved_at?.slice(0, 16) || 'Ongoing'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {incidents.items.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No incidents found matching your regional permissions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
