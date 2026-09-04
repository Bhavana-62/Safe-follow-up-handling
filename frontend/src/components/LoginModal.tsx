import React from 'react';
import { X, User, Shield, Check, Lock } from 'lucide-react';
import { UserPersona } from '../types/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: UserPersona[];
  currentUser: UserPersona | null;
  onSelectUser: (username: string) => Promise<void>;
  isLoading: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  personas,
  currentUser,
  onSelectUser,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-md bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-tight">
                Switch Identity Persona
              </h3>
              <p className="text-[11px] text-slate-400">
                Test entitlement filtering & shared session access controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
          {personas.map((p) => {
            const isSelected = currentUser?.username === p.username;
            return (
              <button
                key={p.username}
                type="button"
                onClick={async () => {
                  await onSelectUser(p.username);
                  onClose();
                }}
                disabled={isLoading}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-950/30 ring-1 ring-sky-500/50'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <User className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="font-semibold text-sm text-slate-100">{p.username}</span>
                    {p.department && (
                      <span className="text-xs text-slate-400">· {p.department}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  <span className="text-sky-300 bg-sky-950/60 border border-sky-800/40 px-1.5 py-0.5 rounded">
                    roles: [{p.roles.join(', ')}]
                  </span>
                  <span className="text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded">
                    regions: [{p.regions.join(', ')}]
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center">
            <Lock className="w-3 h-3 mr-1 text-emerald-400" />
            Tokens signed with RS256 algorithm pinning
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
