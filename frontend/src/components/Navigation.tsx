import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  FileText,
  Database,
  Server,
  Bot,
  Search,
  KeyRound,
  History,
  Lock,
  Plus,
  Copy,
  Check,
  User,
  ChevronRight,
  LogOut,
  HardDrive,
} from 'lucide-react';
import { UserPersona } from '../types/api';

export type NavTab =
  | 'overview'
  | 'documents'
  | 'data'
  | 'database'
  | 'systems'
  | 'workspace'
  | 'search'
  | 'permissions'
  | 'activity';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserPersona | null;
  sessionId: string;
  onNewSession: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  sessionId,
  onNewSession,
  onOpenLogin,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItem = (id: NavTab, label: string, Icon: any) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => onSelectTab(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
          isActive
            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
          <span>{label}</span>
        </div>
        {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-400" />}
      </button>
    );
  };

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/90 flex flex-col justify-between h-full select-none shrink-0">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-1 pt-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md shadow-sky-500/10">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-white">SENTINEL</div>
            <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-tight">
              Secure Intelligence
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          <div>{navItem('overview', 'Overview', LayoutDashboard)}</div>

          {/* EXPLORE */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Explore
            </div>
            {navItem('documents', 'Documents', FileText)}
            {navItem('data', 'Enterprise Data', Database)}
            {currentUser?.roles.includes('admin') && navItem('database', 'Database Storage', HardDrive)}
            {navItem('systems', 'Systems', Server)}
          </div>

          {/* INTELLIGENCE */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Intelligence
            </div>
            {navItem('workspace', 'AI Workspace', Bot)}
            {navItem('search', 'Search', Search)}
          </div>

          {/* SECURITY */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Security
            </div>
            {navItem('permissions', 'Access & Permissions', KeyRound)}
            {navItem('activity', 'Activity', History)}
          </div>
        </nav>
      </div>

      {/* Footer: Session & User Identity */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        {/* Session Box */}
        <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Active Session</span>
            <button
              onClick={onNewSession}
              className="hover:text-sky-400 transition-colors flex items-center"
              title="Start a new session"
            >
              <Plus className="w-3 h-3 mr-0.5" />
              New
            </button>
          </div>
          <div className="flex items-center justify-between font-mono text-slate-300">
            <span className="truncate mr-1 text-[10.5px]">{sessionId}</span>
            <button onClick={copySessionId} className="hover:text-white" title="Copy Session ID">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* User Persona & Status */}
        {currentUser && (
          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-2 text-left group flex-1 mr-2"
              title="Click to switch identity persona"
            >
              <div className="h-7 w-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition-colors shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] truncate">
                <div className="font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate">
                  {currentUser.username}
                </div>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span className="text-emerald-400 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                    Verified
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400 flex items-center">
                    <Lock className="w-2.5 h-2.5 mr-0.5" /> Read-Only
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/40 transition-colors shrink-0"
              title="Sign Out / Back to Login Page"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
