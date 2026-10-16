import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  Activity, 
  Cpu, 
  Terminal, 
  Trash2, 
  Edit, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  X, 
  Database,
  Info,
  ExternalLink,
  ChevronRight,
  LogOut,
  Power,
  Mail,
  Sun,
  Moon,
  Key
} from 'lucide-react';
import { Website, DailyReport, MonitoringLog, Alert, DashboardStats, SiteStatus } from './types';
import WebsiteForm from './components/WebsiteForm';
import ReportViewer from './components/ReportViewer';
import AlertLogTable from './components/AlertLogTable';
import PerformanceChart from './components/PerformanceChart';
import WorkspacePanel from './components/WorkspacePanel';
import { getApiUrl } from './lib/api';

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isValidatingAuth, setIsValidatingAuth] = useState(false);

  // Layout states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai-reports' | 'logs' | 'analytics' | 'workspace'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('siteguard_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('siteguard_theme', newTheme);
  };

  // Core telemetry states
  const [websites, setWebsites] = useState<Website[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [logs, setLogs] = useState<MonitoringLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Global loading overlays
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isCheckingSiteId, setIsCheckingSiteId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  // Helper auth header generator
  const getAuthHeaders = () => {
    const token = localStorage.getItem('siteguard_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Perform backend check on token validity
  const checkTokenValidity = async (token: string) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/status'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        fetchAllData();
      } else {
        localStorage.removeItem('siteguard_token');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Auth validation failed", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('siteguard_token');
    if (token) {
      checkTokenValidity(token);
    }
  }, []);

  // Handle manual login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsValidatingAuth(true);

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem('siteguard_token', data.token);
        setIsAuthenticated(true);
        setEmailInput('');
        setPasswordInput('');
        fetchAllData();
      } else {
        setAuthError(data.error || 'Incorrect Admin Email or Password');
      }
    } catch (err) {
      setAuthError('Failed to communicate with authorization server');
    } finally {
      setIsValidatingAuth(false);
    }
  };

  // Log Out operation
  const handleLogOut = () => {
    localStorage.removeItem('siteguard_token');
    setIsAuthenticated(false);
    setWebsites([]);
    setReports([]);
    setLogs([]);
    setAlerts([]);
    setStats(null);
  };

  // Core API loader aggregations
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Load sites list
      const sitesRes = await fetch(getApiUrl('/api/websites'), { headers });
      if (sitesRes.status === 401) return handleLogOut();
      const sitesData = await sitesRes.json();
      setWebsites(Array.isArray(sitesData) ? sitesData : []);

      // Load health reports list
      const reportsRes = await fetch(getApiUrl('/api/reports'), { headers });
      const reportsData = await reportsRes.json();
      const reportsList = Array.isArray(reportsData) ? reportsData : [];
      setReports(reportsList);
      if (reportsList.length > 0 && !selectedReport) {
        setSelectedReport(reportsList[0]);
      }

      // Load alert history & telemetry statistics
      const statsRes = await fetch(getApiUrl('/api/stats'), { headers });
      const statsData = await statsRes.json();
      setStats(statsData);
      setLogs(statsData.recentLogs || []);
      setAlerts(statsData.recentAlerts || []);

    } catch (error) {
      console.error("Failed to load telemetry data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger manual on-demand website health ping
  const triggerManualCheck = async (id: string) => {
    setIsCheckingSiteId(id);
    try {
      const res = await fetch(getApiUrl(`/api/websites/${id}/check`), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const updatedSite = await res.json();
        // Update local list state
        setWebsites(prev => prev.map(s => s.id === id ? updatedSite : s));
        // Refresh overview stats concurrently
        refreshStats();
      }
    } catch (error) {
      console.error("Failed to check website manually", error);
    } finally {
      setIsCheckingSiteId(null);
    }
  };

  // Run bulk manual polling checks
  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      const res = await fetch(getApiUrl('/api/check-all'), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error("Bulk health check failed", error);
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Trigger on-demand Gemini AI report compile
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch(getApiUrl('/api/reports/generate'), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const newReport = await res.json();
        setReports(prev => [newReport, ...prev]);
        setSelectedReport(newReport);
        setActiveTab('ai-reports');
      } else {
        const err = await res.json();
        alert(`Gemini analysis failed: ${err.error || 'Telemetry is too thin to build reports.'}`);
      }
    } catch (error) {
      alert("Error building health report. Ensure your GEMINI_API_KEY is configured.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Refresh stats helper
  const refreshStats = async () => {
    try {
      const res = await fetch(getApiUrl('/api/stats'), { headers: getAuthHeaders() });
      if (res.ok) {
        const statsData = await res.json();
        setStats(statsData);
        setLogs(statsData.recentLogs || []);
        setAlerts(statsData.recentAlerts || []);
      }
    } catch (error) {
      console.error("Failed refreshing stats snapshot", error);
    }
  };

  // Website Form save callback (handles Add & Edit)
  const handleSaveWebsite = async (formData: any) => {
    setIsSavingSite(true);
    try {
      const url = editingWebsite ? `/api/websites/${editingWebsite.id}` : '/api/websites';
      const method = editingWebsite ? 'PUT' : 'POST';

      const res = await fetch(getApiUrl(url), {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsFormOpen(false);
        setEditingWebsite(null);
        fetchAllData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save website information");
      }
    } catch (error) {
      console.error("Error saving website changes", error);
    } finally {
      setIsSavingSite(false);
    }
  };

  // Handle toggling enabled/disabled monitoring status
  const handleToggleEnabled = async (site: Website) => {
    try {
      const res = await fetch(getApiUrl(`/api/websites/${site.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: !site.enabled })
      });
      if (res.ok) {
        const updated = await res.json();
        setWebsites(prev => prev.map(s => s.id === site.id ? updated : s));
        refreshStats();
      }
    } catch (error) {
      console.error("Failed to toggle website monitoring state", error);
    }
  };

  // Handle website deletion
  const handleDeleteWebsite = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${name}" from your active monitoring safeguard list? All history logs will be removed.`)) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/websites/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setWebsites(prev => prev.filter(s => s.id !== id));
        refreshStats();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete website");
      }
    } catch (error) {
      console.error("Deletion query failed", error);
    }
  };

  // View Form helper
  const openAddForm = () => {
    setEditingWebsite(null);
    setIsFormOpen(true);
  };

  const openEditForm = (site: Website) => {
    setEditingWebsite(site);
    setIsFormOpen(true);
  };

  // Render Login state
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen gradient-bg flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white ${theme === 'light' ? 'light-theme' : ''}`}>
        {/* Subtle decorative mesh background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        <div className="relative w-full max-w-md glass neon-border-blue rounded-2xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center neon-border-blue mb-4">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-sans font-bold text-2xl tracking-tight text-white">Tk site guide Ai</h1>
            <p className="text-blue-400 text-xs font-medium uppercase tracking-widest mt-2">
              System Monitor • V2.4.0
            </p>
            <p className="text-slate-400 text-xs mt-3 max-w-xs leading-relaxed">
              Personal Web Infrastructure Monitoring & Intelligent Incident Safeguarding Console
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 text-sm font-sans tracking-wide"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Admin Security Password
              </label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter Access Secret Key..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 text-sm font-mono tracking-wider"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmailInput('easterntechexpo@gmail.com');
                  setPasswordInput('siteguard123');
                  setAuthError(null);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Fill Admin Credentials</span>
              </button>
              <span className="text-[11px] text-slate-500 font-mono">Default: siteguard123</span>
            </div>

            <button
              type="submit"
              disabled={isValidatingAuth}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isValidatingAuth ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Decrypting Gateway...
                </>
              ) : (
                <>
                  <span>Authenticate Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-white/10 text-center">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Tk site guide Ai Security Layer
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loaded Dashboard UI
  return (
    <div className={`min-h-screen gradient-bg text-slate-200 flex flex-col font-sans selection:bg-blue-500 selection:text-white ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/40 border-b border-white/10 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center neon-border-blue">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-sans font-bold text-lg text-white tracking-tight">Tk site guide Ai</h1>
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full status-pulse" title="System Polling Active"></span>
            </div>
            <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest">System Monitor • V2.4.0</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckAll}
            disabled={isCheckingAll || websites.length === 0}
            className="hidden sm:flex px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md active:scale-[0.98] transition-all items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Activity className={`w-3.5 h-3.5 ${isCheckingAll ? 'status-pulse' : ''}`} />
            {isCheckingAll ? 'Checking Sites...' : 'Trigger Audit All'}
          </button>

          <button
            onClick={fetchAllData}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>

          <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

          <div className="flex items-center bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 mr-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 status-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase">System Nominal</span>
          </div>

          <button
            onClick={handleLogOut}
            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
            title="Log Out Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Email Alerts Advisory Notice */}
        {(stats && stats.resendConfigured === false) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 text-slate-300 animate-in fade-in duration-200">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-white block mb-0.5">💡 Demo Mode: Email alert dispatch is simulating</span>
              <span>Because <code>RESEND_API_KEY</code> is not yet configured in your server environment secrets, downstream client alert emails will be recorded and displayed in your logs instead of sending. Configure it in the server secrets panel to enable real automated delivery.</span>
            </div>
          </div>
        )}

        {/* Statistics Widgets Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {/* Stat 1: Total Sites */}
          <div className="glass p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sites</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{stats?.totalWebsites ?? websites.length}</span>
              <span className="text-xs text-slate-400">items</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Configured for active check</p>
          </div>

          {/* Stat 2: Online */}
          <div className="glass p-4 rounded-xl border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Online Status</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-emerald-400">{stats?.onlineWebsites ?? websites.filter(s => s.status === 'ONLINE').length}</span>
              <span className="text-xs text-emerald-500/60">active</span>
            </div>
            <p className="text-[9px] text-emerald-400 mt-1 flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block status-pulse"></span>
              All ping checks passing
            </p>
          </div>

          {/* Stat 3: Offline / Warnings */}
          <div className="glass p-4 rounded-xl border-l-4 border-l-rose-500 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outages Detected</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-rose-500">{stats?.offlineWebsites ?? websites.filter(s => s.status === 'OFFLINE' || s.status === 'ERROR').length}</span>
              <span className="text-xs text-rose-500/60">offline</span>
            </div>
            <p className="text-[9px] text-rose-400 mt-1">Requiring rapid recovery</p>
          </div>

          {/* Stat 4: Average Response Latency */}
          <div className="glass p-4 rounded-xl flex flex-col justify-between col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Latency</span>
            <div className="mt-2 flex items-baseline gap-0.5">
              <span className="text-3xl font-bold text-blue-400">{stats?.averageResponseTime ?? 0}</span>
              <span className="text-xs font-mono text-blue-500/60">ms</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Average response speed</p>
          </div>

          {/* Stat 5: FREE TIER OPTIMIZATION WRITES SAVED */}
          <div className="glass p-4 rounded-xl border-t border-t-blue-500/50 flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Writes Saved</span>
              <Database className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-0.5">
                <span className="text-3xl font-bold text-white">{stats?.writesSaved ?? 0}</span>
                <span className="text-[10px] text-blue-400 font-bold">ops</span>
              </div>
              <p className="text-[8px] text-slate-400 mt-1">Firestore logging optimized</p>
            </div>
          </div>
        </div>

        {/* Section Tabs Navigator */}
        <div className="flex border-b border-white/10 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2.5 font-sans text-sm font-semibold tracking-tight transition-all relative cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ Active Infrastructure ({websites.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 font-sans text-sm font-semibold tracking-tight transition-all relative cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 Performance Graphs
          </button>
          <button
            onClick={() => setActiveTab('ai-reports')}
            className={`px-5 py-2.5 font-sans text-sm font-semibold tracking-tight transition-all relative cursor-pointer whitespace-nowrap ${
              activeTab === 'ai-reports' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🤖 Gemini AI Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2.5 font-sans text-sm font-semibold tracking-tight transition-all relative cursor-pointer whitespace-nowrap ${
              activeTab === 'logs' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🚨 Alerts & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-5 py-2.5 font-sans text-sm font-semibold tracking-tight transition-all relative cursor-pointer whitespace-nowrap ${
              activeTab === 'workspace' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ☁️ Google Workspace
          </button>
        </div>

        {/* Tab Contents */}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center glass p-4 rounded-xl border border-white/10">
              <div>
                <h3 className="font-sans font-bold text-white">Monitored Client Gateways</h3>
                <p className="text-xs text-slate-400">Manage real-time health configurations for clients</p>
              </div>
              <button
                onClick={openAddForm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5 hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer neon-border-blue"
              >
                <Plus className="w-4 h-4" />
                Add Website
              </button>
            </div>

            {/* Websites Table Grid */}
            {websites.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center border border-white/10">
                <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-4 status-pulse" />
                <h4 className="font-sans font-semibold text-lg text-white mb-1">Protect Your First Website</h4>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                  Add website URLs of your clients, configure automatic scan intervals, and safeguard your systems immediately.
                </p>
                <button
                  onClick={openAddForm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Website
                </button>
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Website Details</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Client & contact</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Interval</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Status</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Latency</th>
                        <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {websites.map((site) => (
                        <tr key={site.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${site.enabled ? 'bg-emerald-500 status-pulse' : 'bg-slate-600'}`} title={site.enabled ? 'Monitoring Active' : 'Monitoring Disabled'}></span>
                              <div className="font-semibold text-white text-sm">{site.name}</div>
                            </div>
                            <div className="text-xs text-blue-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{site.url}</span>
                              <a href={site.url.startsWith('http') ? site.url : `http://${site.url}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-slate-300">{site.clientName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{site.contactEmail}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-300 font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {site.monitoringInterval}m
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {!site.enabled ? (
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                INACTIVE
                              </span>
                            ) : site.status === 'ONLINE' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                                ONLINE
                              </span>
                            ) : site.status === 'ERROR' ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                                ERROR
                              </span>
                            ) : site.status === 'OFFLINE' ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/25 text-rose-400 text-[10px] font-bold uppercase tracking-widest">
                                OFFLINE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs">
                            {site.lastResponseTime !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">{site.lastResponseTime}ms</span>
                                <div className="w-12 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${site.lastResponseTime > 1000 ? 'bg-amber-400' : 'bg-blue-500'}`} 
                                    style={{ width: `${Math.min(100, (site.lastResponseTime / 1500) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => triggerManualCheck(site.id)}
                                disabled={isCheckingSiteId === site.id || !site.enabled}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                                title="Run manual check now"
                              >
                                <Play className={`w-3.5 h-3.5 ${isCheckingSiteId === site.id ? 'animate-spin text-blue-400' : ''}`} />
                              </button>
                              
                              <button
                                onClick={() => handleToggleEnabled(site)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${site.enabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/5'}`}
                                title={site.enabled ? 'Disable active checks' : 'Enable active checks'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openEditForm(site)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                title="Edit website info"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteWebsite(site.id, site.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete from monitoring"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI HOURLY/DAILY ANALYSIS REPORTS */}
        {activeTab === 'ai-reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar list of reports */}
            <div className="glass rounded-xl border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-sans font-bold text-white">Historical Audits</h3>
                  <p className="text-[10px] text-slate-400">All saved health analyses</p>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {isGeneratingReport ? 'Generating...' : 'Audit Now'}
                </button>
              </div>

              {reports.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No reports compiled yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReport(r)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedReport?.id === r.id 
                          ? 'border-blue-500 bg-blue-500/15 text-white font-bold' 
                          : 'border-white/5 hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{new Date(r.generatedAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.totalChecks} ping logs processed</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm ${r.healthScore >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {r.healthScore}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main analysis viewer */}
            <div className="lg:col-span-2">
              <ReportViewer 
                report={selectedReport} 
                onGenerateReport={handleGenerateReport} 
                isGenerating={isGeneratingReport} 
              />
            </div>
          </div>
        )}

        {/* TAB 3: ALERTS LOGS & INCIDENT TELEMETRY */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-sans font-bold text-lg text-white">Telemetry History Logs</h3>
              <p className="text-xs text-slate-400">Trace and search client health logs and consecutive failures.</p>
            </div>

            <AlertLogTable 
              logs={logs} 
              alerts={alerts} 
              onRefresh={refreshStats} 
              isLoading={isLoading} 
            />
          </div>
        )}

        {/* TAB 4: PERFORMANCE GRAPH PLOTS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <PerformanceChart websites={websites} />
          </div>
        )}

        {/* TAB 5: GOOGLE WORKSPACE INTEGRATIONS */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">
            <WorkspacePanel websites={websites} stats={stats} />
          </div>
        )}
      </main>

      {/* Website Edit/Add Modal Overlay */}
      {isFormOpen && (
        <WebsiteForm 
          website={editingWebsite} 
          onSave={handleSaveWebsite} 
          onClose={() => setIsFormOpen(false)} 
          isLoading={isSavingSite} 
        />
      )}

      {/* Footer bar */}
      <footer className="mt-auto py-6 border-t border-white/5 text-center">
        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
          Tk site guide Ai Admin Console • Safeguarding Client Infrastructures Securely
        </p>
      </footer>
    </div>
  );
}
