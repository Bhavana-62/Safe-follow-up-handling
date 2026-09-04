import React, { useState } from 'react';
import {
  Shield,
  Lock,
  ArrowRight,
  User,
  Mail,
  AlertCircle,
  Loader2,
  Database,
  KeyRound,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { UserPersona } from '../types/api';

interface LoginPageProps {
  personas: UserPersona[];
  onLogin: (email: string, password?: string) => Promise<void>;
  onRegister?: (email: string, password: string, department?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  personas,
  onLogin,
  onRegister,
  isLoading,
  error,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('General');
  const [showDevPersonas, setShowDevPersonas] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (mode === 'register') {
      if (!email.trim() || !password) {
        setLocalError('Please provide both email and password.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (password.length < 10) {
        setLocalError('Password must be at least 10 characters long.');
        return;
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        setLocalError('Password must include uppercase, lowercase, digit, and special character.');
        return;
      }

      if (onRegister) {
        try {
          await onRegister(email.trim(), password, department);
        } catch (err: any) {
          setLocalError(err.message || 'Registration failed');
        }
      }
    } else {
      if (!email.trim()) {
        setLocalError('Please enter your registered email or username.');
        return;
      }
      try {
        await onLogin(email.trim(), password);
      } catch (err: any) {
        setLocalError(err.message || 'Authentication failed');
      }
    }
  };

  const handleSelectDevPersona = async (uname: string) => {
    setLocalError(null);
    setEmail(uname);
    setPassword('devpassword');
    try {
      await onLogin(uname, 'devpassword');
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md shadow-sky-500/10">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-white">SENTINEL</div>
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
              Secure Enterprise Intelligence Platform
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Real Database Auth Active
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:flex items-center text-slate-400">
            <Lock className="w-3 h-3 mr-1 text-purple-400" />
            PBKDF2-SHA256 (600k iter) & RS256 JWT
          </span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/50">
              <KeyRound className="w-3.5 h-3.5 mr-1 text-sky-400" />
              <span>Verified Enterprise Identity Gate</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {mode === 'signin' ? 'Sign In to Workspace' : 'Register Enterprise Account'}
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {mode === 'signin'
                ? 'Sign in using your corporate email and password stored securely in the persistent enterprise database.'
                : 'Create your enterprise credentials. All new users receive default minimal permissions by construction.'}
            </p>
          </div>

          {(error || localError) && (
            <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/40 flex items-center space-x-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error || localError}</span>
            </div>
          )}

          {/* Card Container */}
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-2xl space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('signin'); setLocalError(null); }}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setLocalError(null); }}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">
                  {mode === 'signin' ? 'Email or Username' : 'Corporate Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={mode === 'signin' ? 'text' : 'email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'signin' ? 'user@enterprise.corp or username' : 'name@company.corp'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Department</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="General">General</option>
                      <option value="Support">Support</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance (Requires Admin Approval)</option>
                      <option value="Procurement">Procurement (Requires Admin Approval)</option>
                      <option value="Sales">Sales (Requires Admin Approval)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Min 10 chars, uppercase, digit, symbol' : '••••••••••••'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                    required
                  />
                </div>
                {mode === 'register' && (
                  <p className="text-[11px] text-slate-400">
                    Policy: ≥10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character.
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div className="p-3 rounded-xl border border-sky-900/40 bg-sky-950/20 space-y-1 text-[11px] text-slate-300">
                  <div className="font-semibold text-sky-300 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-sky-400" />
                    <span>Principle of Least Privilege Applied</span>
                  </div>
                  <p className="text-slate-400">
                    Self-registered accounts strictly receive baseline permissions (<code className="text-slate-200">roles: [employee]</code> in <code className="text-slate-200">regions: [EMEA]</code>). Elevated access to ERP financial invoices, purchase orders, or pricing policies must be assigned by an administrator.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>{mode === 'signin' ? 'Authenticating...' : 'Registering Account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Platform' : 'Create Account & Sign In'}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>

            {/* Developer Testing Accordion */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDevPersonas(!showDevPersonas)}
                className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-300 py-1"
              >
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">Developer Testing: Pre-configured Personas</span>
                </div>
                {showDevPersonas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDevPersonas && (
                <div className="mt-3 space-y-2 text-xs">
                  <p className="text-[11px] text-slate-400">
                    For local testing and automated test evaluation only. Click any persona to sign in with pre-seeded roles:
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    {personas.map((p) => (
                      <button
                        key={p.username}
                        type="button"
                        onClick={() => handleSelectDevPersona(p.username)}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/80 hover:border-sky-500/50 hover:bg-slate-900 text-left transition-colors"
                      >
                        <div className="font-bold text-sky-300 truncate">{p.username}</div>
                        <div className="text-[10px] text-slate-400">[{p.roles.join(', ')}]</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Security Badges */}
      <footer className="p-4 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 text-center flex flex-wrap items-center justify-center gap-6 shrink-0">
        <div className="flex items-center space-x-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real Database Storage (<code className="text-slate-300">users</code> table in SQLite)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>Zero Client-Side Mock Auth · Salted OWASP Hashes</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>Strict Pre-Retrieval Entitlement Filtering</span>
        </div>
      </footer>
    </div>
  );
};
