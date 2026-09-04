import React from 'react';
import { Shield, Lock, User, RefreshCw, KeyRound } from 'lucide-react';
import { UserPersona } from '../types/api';

interface HeaderProps {
  currentUser: UserPersona | null;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenLogin }) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              Secure Read-Only Enterprise Agent
            </h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
              <Lock className="w-2.5 h-2.5 mr-1" />
              Read-Only
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Identity-scoped hybrid retrieval · Zero writes · Grounded evidence citations
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {currentUser ? (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200 flex items-center justify-end space-x-1">
                <span>{currentUser.username}</span>
                {currentUser.department && (
                  <span className="text-slate-400">({currentUser.department})</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end space-x-1.5">
                <span className="text-sky-400 font-mono">
                  [{currentUser.roles.join(', ')}]
                </span>
                <span>•</span>
                <span className="text-amber-400 font-mono">
                  [{currentUser.regions.join(', ')}]
                </span>
              </div>
            </div>

            <button
              onClick={onOpenLogin}
              className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/70 hover:border-slate-600 transition-colors shadow-sm"
              title="Switch user persona to test identity access boundaries"
            >
              <User className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              Switch Persona
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
            Authenticate
          </button>
        )}
      </div>
    </header>
  );
};
