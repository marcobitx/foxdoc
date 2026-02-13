// frontend/src/components/App.tsx
// Root application shell — orchestrates layout, routing, and view transitions
// Entry point for the React island; mounted client-only in index.astro
// Related: store.ts, Sidebar.tsx, TopBar.tsx

import { useCallback } from 'react';
import { appStore, useStore, type AppView } from '../lib/store';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import UploadView from './UploadView';
import AnalyzingView from './AnalyzingView';
import ResultsView from './ResultsView';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';

export default function App() {
  const state = useStore(appStore);

  const navigate = useCallback((view: AppView, analysisId?: string) => {
    appStore.setState({
      view,
      currentAnalysisId: analysisId ?? state.currentAnalysisId,
      error: null,
    });
  }, [state.currentAnalysisId]);

  const renderView = () => {
    switch (state.view) {
      case 'upload':
        return <UploadView onStarted={(id) => navigate('analyzing', id)} />;
      case 'analyzing':
        return (
          <AnalyzingView
            analysisId={state.currentAnalysisId!}
            onComplete={() => navigate('results')}
            onError={(err) => appStore.setState({ error: err })}
          />
        );
      case 'results':
        return (
          <ResultsView
            analysisId={state.currentAnalysisId!}
            onBack={() => navigate('upload')}
          />
        );
      case 'history':
        return (
          <HistoryView
            onSelect={(id) => navigate('results', id)}
            onNew={() => navigate('upload')}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return <UploadView onStarted={(id) => navigate('analyzing', id)} />;
    }
  };

  return (
    <div className="relative z-10 flex h-screen overflow-hidden">
      {/* Left navigation sidebar */}
      <Sidebar
        currentView={state.view}
        onNavigate={navigate}
        isOpen={state.sidebarOpen}
        onToggle={() => appStore.setState({ sidebarOpen: !state.sidebarOpen })}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          currentView={state.view}
          error={state.error}
          onDismissError={() => appStore.setState({ error: null })}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-5 py-6 md:px-8 md:py-8 lg:px-10">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
