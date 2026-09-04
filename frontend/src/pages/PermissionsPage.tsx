import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, CheckCircle2, XCircle, Lock, User } from 'lucide-react';
import { UserPermissions, UserPersona } from '../types/api';
import { fetchPermissions } from '../api/client';

interface PermissionsPageProps {
  token: string | null;
  currentUser: UserPersona | null;
}

export const PermissionsPage: React.FC<PermissionsPageProps> = ({ token, currentUser }) => {
  const [perms, setPerms] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchPermissions(token)
      .then(setPerms)
      .finally(() => setLoading(false));
  }, [token, currentUser?.username]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
          <KeyRound className="w-6 h-6 mr-2 text-sky-400" />
          Caller Identity & Access Scope
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Live inspection of verified JWT claims, regional scopes, and runtime tool authorization boundaries.
        </p>
      </div>

      {perms && (
        <div className="space-y-6">
          {/* Identity Claims Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center">
              <User className="w-4 h-4 mr-1.5 text-sky-400" />
              <span>Verified Caller Claims</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Subject (sub)</span>
                <span className="text-white font-semibold text-sm">{perms.subject}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Assigned Roles</span>
                <span className="text-sky-300 font-semibold">[{perms.roles.join(', ')}]</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Regional Scope</span>
                <span className="text-amber-300 font-semibold">[{perms.regions.join(', ')}]</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Department</span>
                <span className="text-slate-200">{perms.department}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center space-x-2 pt-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Algorithm Pinning: {perms.token_verification}</span>
            </div>
          </div>

          {/* Allowed Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Authorized Read-Only Tools ({perms.allowed_tools.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perms.allowed_tools.map((t) => (
                <div
                  key={t.name}
                  className="p-3.5 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 font-mono">{t.name}</span>
                    <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/40 px-1.5 py-0.5 rounded">
                      Limit: {t.row_limit} rows
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{t.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Denied Tools */}
          {perms.denied_tools.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center">
                <XCircle className="w-4 h-4 mr-1.5" />
                <span>Restricted / Denied Tools ({perms.denied_tools.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {perms.denied_tools.map((t) => (
                  <div
                    key={t.name}
                    className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300 font-mono">{t.name}</span>
                      <span className="text-[10px] font-mono text-rose-400">Denied</span>
                    </div>
                    <p className="text-xs text-slate-300">{t.description}</p>
                    <p className="text-[11px] text-rose-300/80 font-mono">{t.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
