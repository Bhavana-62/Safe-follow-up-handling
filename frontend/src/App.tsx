import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { ChatWindow } from './components/ChatWindow';
import { QuestionInput } from './components/QuestionInput';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EnterpriseDataPage } from './pages/EnterpriseDataPage';
import { DatabasePage } from './pages/DatabasePage';
import { SystemsPage } from './pages/SystemsPage';
import { SearchPage } from './pages/SearchPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { ActivityPage } from './pages/ActivityPage';
import { ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const {
    token,
    currentUser,
    personas,
    loading: authLoading,
    error: authError,
    isAuthenticated,
    login,
    register,
    logout,
    switchUser,
  } = useAuth();

  const {
    sessionId,
    messages,
    isLoading: chatLoading,
    error: chatError,
    newSession,
    sendQuestion,
  } = useChat(token, currentUser);

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // If not authenticated, render dedicated Enterprise Login Page
  if (!isAuthenticated) {
    return (
      <LoginPage
        personas={personas}
        onLogin={login}
        onRegister={register}
        isLoading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* SENTINEL Global Sidebar Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        sessionId={sessionId}
        onNewSession={newSession}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={logout}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
        <Header currentUser={currentUser} onOpenLogin={() => setIsLoginOpen(true)} />

        {authError && (
          <div className="bg-rose-950/60 border-b border-rose-900/80 px-6 py-2 flex items-center space-x-2 text-xs text-rose-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Dynamic Route Switching */}
        {activeTab === 'overview' && (
          <OverviewPage
            token={token}
            currentUser={currentUser}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsPage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'data' && (
          <EnterpriseDataPage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'database' && (
          <DatabasePage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'systems' && (
          <SystemsPage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'search' && (
          <SearchPage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'permissions' && (
          <PermissionsPage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'activity' && (
          <ActivityPage token={token} currentUser={currentUser} />
        )}

        {activeTab === 'workspace' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ChatWindow messages={messages} sessionId={sessionId} />
            <QuestionInput onSend={sendQuestion} isLoading={chatLoading || authLoading} />
          </div>
        )}
      </div>

      {/* Identity Persona Switcher Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        personas={personas}
        currentUser={currentUser}
        onSelectUser={switchUser}
        isLoading={authLoading}
      />
    </div>
  );
}

export default App;
