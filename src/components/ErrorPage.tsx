import React, { useState } from 'react';
import {
  ServerCrash,
  WifiOff,
  Bug,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { AppError } from '../types/error';

interface ErrorPageProps {
  error: AppError;
  onClearError?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ error, onClearError }) => {
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRetry = async () => {
    if (!error.retryAction) {
      window.location.reload();
      return;
    }
    setRetrying(true);
    try {
      await error.retryAction();
      if (onClearError) onClearError();
    } finally {
      setRetrying(false);
    }
  };

  const handleCopyDiagnostics = () => {
    const payload = JSON.stringify(
      {
        timestamp: error.timestamp,
        category: error.category,
        title: error.title,
        message: error.message,
        endpoint: error.endpoint,
        statusCode: error.statusCode,
        details: error.details,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamically select iconography and badges based on category
  const renderCategoryIcon = () => {
    switch (error.category) {
      case 'runtime':
        return <Bug className="w-8 h-8 text-purple-400" />;
      case 'network':
        return <WifiOff className="w-8 h-8 text-red-400" />;
      case 'server':
        return <ServerCrash className="w-8 h-8 text-rose-400" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-amber-400" />;
    }
  };

  const badgeConfig = {
    network: {
      badge: 'HTTP 503 • CONNECTION OFFLINE',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
      iconBoxClass: 'bg-red-950/60 border-red-500/40 shadow-red-900/40 text-red-400',
    },
    server: {
      badge: `HTTP ${error.statusCode || 500} • SERVER FAULT`,
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      iconBoxClass: 'bg-rose-950/60 border-rose-500/40 shadow-rose-900/40 text-rose-400',
    },
    runtime: {
      badge: 'CLIENT EXCEPTION • RUNTIME ERROR',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      iconBoxClass: 'bg-purple-950/60 border-purple-500/40 shadow-purple-900/40 text-purple-400',
    },
    unknown: {
      badge: 'APPLICATION ISSUE',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      iconBoxClass: 'bg-amber-950/60 border-amber-500/40 shadow-amber-900/40 text-amber-400',
    },
  }[error.category];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-red-500 selection:text-white">
      
      {/* Top Application Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900/90 border border-slate-700/60 p-1.5 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <img src="/carching.png" alt="CARCHING" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">CARCHING</h1>
            <span className="text-[11px] text-slate-400">Visitor Analytics Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            System Alert
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full">
          
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Error Category Icon Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${badgeConfig.iconBoxClass}`}>
                  {renderCategoryIcon()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-red-500/60 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Title & Human Description */}
            <div className="text-center mb-6">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border inline-block mb-2 ${badgeConfig.badgeClass}`}>
                {badgeConfig.badge}
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {error.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                {error.message}
              </p>
            </div>

            {/* Dynamic Technical Diagnostic Card */}
            <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 mb-5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2 pb-1.5 border-b border-slate-800/60 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Diagnostic Telemetry
                </span>
                <span className="text-slate-500 text-[10px]">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {error.endpoint && (
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span className="text-slate-500">API Target:</span>
                  <span className="text-slate-300 font-bold">{error.endpoint}</span>
                </div>
              )}

              {error.details && (
                <div className="mt-1.5">
                  <div className="text-red-300/90 bg-red-950/30 p-2 rounded border border-red-900/30 break-all select-all text-[11px]">
                    {error.details}
                  </div>
                </div>
              )}

              {/* Action: Copy Diagnostic JSON */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/40 text-[11px]">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-slate-500 hover:text-slate-300 transition underline underline-offset-2 cursor-pointer"
                >
                  {showDetails ? 'Hide Stack Trace' : 'View Stack Details'}
                </button>

                <button
                  onClick={handleCopyDiagnostics}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-md cursor-pointer font-sans text-xs"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Diagnostics'}</span>
                </button>
              </div>

              {showDetails && error.details && (
                <pre className="mt-2.5 p-2.5 bg-slate-900/90 rounded border border-slate-800 text-[10px] text-slate-400 overflow-x-auto max-h-36 custom-scrollbar whitespace-pre-wrap">
                  {error.details}
                </pre>
              )}
            </div>

            {/* Targeted Troubleshooting Based on Category */}
            <div className="space-y-1.5 mb-6 text-xs text-slate-400">
              {error.category === 'network' || error.category === 'server' ? (
                <>
                  <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                    <span>Check that the backend process is running on port 3001 (<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-[11px]">npm run server</code> or <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded text-[11px]">npm run dev</code>).</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                    <span>Verify network connectivity and check that no local firewall is blocking internal port forwarding.</span>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                  <span>An unhandled client render exception occurred. Reloading the application will reset runtime state safely.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying Operation...' : 'Retry Operation'}
              </button>

              {error.recoverAction && (
                <button
                  onClick={error.recoverAction}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {error.recoverLabel || 'Dismiss & Return'}
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                title="Perform full browser reload"
                className="w-full sm:w-auto p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition border border-slate-800 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          <p className="text-center text-[11px] text-slate-600 mt-4">
            CARCHING Enterprise Resilience Framework • Zero Unhandled Failures
          </p>

        </div>
      </main>

    </div>
  );
};
