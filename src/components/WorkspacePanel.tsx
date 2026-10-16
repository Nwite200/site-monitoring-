import React, { useState, useEffect } from 'react';
import { Website, DashboardStats } from '../types';
import { 
  getGoogleAccessToken, 
  googleSignIn, 
  googleSignOut, 
  initGoogleAuth 
} from '../lib/googleAuth';
import { 
  ensureDriveFolder, 
  uploadFileToDrive, 
  sendGmailEmail 
} from '../lib/googleApis';
import { 
  Cloud, 
  FolderSync, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  Loader2, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { User } from 'firebase/auth';

interface WorkspacePanelProps {
  websites: Website[];
  stats: DashboardStats | null;
}

export default function WorkspacePanel({ websites, stats }: WorkspacePanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Drive State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Gmail State
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [testAlertType, setTestAlertType] = useState<'DOWN' | 'RECOVERY'>('DOWN');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Status Email State
  const [statusRecipient, setStatusRecipient] = useState('');
  const [isSendingStatus, setIsSendingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // Automated Backend Report Dispatch States
  const [backendReportPeriod, setBackendReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [backendReportRecipient, setBackendReportRecipient] = useState('easterntechexpo@gmail.com');
  const [isBackendDispatching, setIsBackendDispatching] = useState(false);
  const [backendDispatchSuccess, setBackendDispatchSuccess] = useState<string | null>(null);
  const [backendDispatchError, setBackendDispatchError] = useState<string | null>(null);

  // Automated Backend Alert Test States
  const [backendAlertSiteId, setBackendAlertSiteId] = useState('');
  const [backendAlertState, setBackendAlertState] = useState<'DOWN' | 'RECOVERY'>('DOWN');
  const [backendAlertRecipient, setBackendAlertRecipient] = useState('easterntechexpo@gmail.com');
  const [isBackendAlerting, setIsBackendAlerting] = useState(false);
  const [backendAlertSuccess, setBackendAlertSuccess] = useState<string | null>(null);
  const [backendAlertError, setBackendAlertError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize google auth state listener on mount
    const unsubscribe = initGoogleAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    
    // Check if token already exists in-memory
    const existingToken = getGoogleAccessToken();
    if (existingToken) {
      setToken(existingToken);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setDriveError(null);
    setGmailError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setDriveError('Failed to sign in with Google: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setBackupSuccess(null);
      setGmailSuccess(null);
      setStatusSuccess(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleBackupSites = async () => {
    if (!token) return;
    setIsBackingUp(true);
    setBackupSuccess(null);
    setDriveError(null);

    try {
      // Find or create 'SiteGuard Backup' folder
      const folderId = await ensureDriveFolder(token, 'SiteGuard Backup');
      
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `siteguard_websites_backup_${dateStr.split('T')[0]}.json`;
      
      const fileData = {
        exportedAt: new Date().toISOString(),
        websitesCount: websites.length,
        websites: websites
      };

      const result = await uploadFileToDrive(
        token,
        fileName,
        JSON.stringify(fileData, null, 2),
        'application/json',
        folderId
      );

      setBackupSuccess(`Saved "${fileName}" inside 'SiteGuard Backup' folder!`);
    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || 'Failed to complete Google Drive backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSendTestAlert = async () => {
    if (!token) return;
    if (!selectedSiteId) {
      setGmailError('Please select a website for the test alert.');
      return;
    }
    if (!recipientEmail) {
      setGmailError('Please enter a recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setGmailSuccess(null);
    setGmailError(null);

    try {
      const site = websites.find(w => w.id === selectedSiteId);
      if (!site) throw new Error('Selected website not found');

      const subject = `[SiteGuard Alert] ${site.name} is ${testAlertType === 'DOWN' ? 'DOWN 🚨' : 'RECOVERED ✅'}`;
      
      const bodyHtml = `
        <div style="font-family: system-ui, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; padding: 12px; background-color: ${testAlertType === 'DOWN' ? '#fef2f2' : '#f0fdf4'}; border-radius: 50%;">
              <span style="font-size: 24px;">${testAlertType === 'DOWN' ? '🚨' : '✅'}</span>
            </div>
            <h2 style="margin-top: 12px; color: ${testAlertType === 'DOWN' ? '#991b1b' : '#166534'};">${testAlertType === 'DOWN' ? 'Downtime Alert' : 'Service Recovered'}</h2>
            <p style="font-size: 14px; color: #64748b; margin-top: 4px;">SiteGuard Infrastructure Automated Security Notification</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;"><strong>Target URL:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #0f172a;"><a href="${site.url}" style="color: #2563eb; text-decoration: none;">${site.url}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;"><strong>Status Indicator:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${testAlertType === 'DOWN' ? '#dc2626' : '#10b981'};">${testAlertType === 'DOWN' ? 'OFFLINE' : 'ONLINE'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;"><strong>Response Latency:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #0f172a;">${site.lastResponseTime || 120} ms</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;"><strong>Timestamp:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #0f172a;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 20px 0;">
            This alert was manually dispatched to verify your Gmail API credentials. SiteGuard is continuously polling your services.
          </p>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
            Security notification dispatched directly via Google Workspace API.
          </p>
        </div>
      `;

      await sendGmailEmail(token, recipientEmail, subject, bodyHtml);
      setGmailSuccess(`Test alert emailed successfully to ${recipientEmail}!`);
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || 'Failed to dispatch Gmail test notification');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendStatusSummary = async () => {
    if (!token) return;
    if (!statusRecipient) {
      setGmailError('Please enter a recipient for the status summary.');
      return;
    }

    setIsSendingStatus(true);
    setStatusSuccess(null);
    setGmailError(null);

    try {
      const subject = `[SiteGuard System Status] Infrastructure Summary - ${new Date().toLocaleDateString()}`;
      
      const onlineCount = websites.filter(w => w.enabled && w.status === 'ONLINE').length;
      const offlineCount = websites.filter(w => w.enabled && w.status === 'OFFLINE').length;
      const disabledCount = websites.filter(w => !w.enabled).length;

      const bodyHtml = `
        <div style="font-family: system-ui, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e3a8a; margin-top: 0; text-align: center;">SiteGuard Fleet Status</h2>
          <p style="font-size: 14px; text-align: center; color: #64748b; margin-bottom: 24px;">Generated on ${new Date().toLocaleString()}</p>

          <div style="display: flex; gap: 10px; margin: 20px 0; border-radius: 8px; overflow: hidden;">
            <div style="flex: 1; padding: 12px; text-align: center; background-color: #f0fdf4; border: 1px solid #dcfce7;">
              <span style="font-size: 12px; color: #15803d; font-weight: bold; text-transform: uppercase;">ONLINE</span>
              <div style="font-size: 24px; font-weight: bold; color: #166534; margin-top: 4px;">${onlineCount}</div>
            </div>
            <div style="flex: 1; padding: 12px; text-align: center; background-color: #fef2f2; border: 1px solid #fee2e2;">
              <span style="font-size: 12px; color: #b91c1c; font-weight: bold; text-transform: uppercase;">OFFLINE</span>
              <div style="font-size: 24px; font-weight: bold; color: #991b1b; margin-top: 4px;">${offlineCount}</div>
            </div>
            <div style="flex: 1; padding: 12px; text-align: center; background-color: #f8fafc; border: 1px solid #e2e8f0;">
              <span style="font-size: 12px; color: #475569; font-weight: bold; text-transform: uppercase;">PAUSED</span>
              <div style="font-size: 24px; font-weight: bold; color: #1e293b; margin-top: 4px;">${disabledCount}</div>
            </div>
          </div>

          <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #0f172a;">Active Infrastructure Registry</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Website</th>
                <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Status</th>
                <th style="padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: right;">Response</th>
              </tr>
            </thead>
            <tbody>
              ${websites.map(w => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px;">
                    <strong>${w.name}</strong><br/>
                    <span style="font-size: 11px; color: #64748b;">${w.url}</span>
                  </td>
                  <td style="padding: 8px; font-weight: bold; color: ${!w.enabled ? '#64748b' : w.status === 'ONLINE' ? '#16a34a' : '#dc2626'};">
                    ${!w.enabled ? 'PAUSED' : w.status}
                  </td>
                  <td style="padding: 8px; text-align: right; font-family: monospace; color: #475569;">
                    ${w.lastResponseTime ? `${w.lastResponseTime}ms` : 'N/A'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
            Status Summary dispatched directly via Google Workspace API.
          </p>
        </div>
      `;

      await sendGmailEmail(token, statusRecipient, subject, bodyHtml);
      setStatusSuccess(`Status summary successfully emailed to ${statusRecipient}!`);
      setStatusRecipient('');
    } catch (err: any) {
      console.error(err);
      setGmailError(err.message || 'Failed to dispatch status report via Gmail');
    } finally {
      setIsSendingStatus(false);
    }
  };

  const handleDispatchBackendReport = async () => {
    setIsBackendDispatching(true);
    setBackendDispatchSuccess(null);
    setBackendDispatchError(null);

    const apiToken = localStorage.getItem('siteguard_token');
    
    try {
      const res = await fetch('/api/reports/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken || ''}`
        },
        body: JSON.stringify({
          period: backendReportPeriod,
          recipient: backendReportRecipient
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error dispatching ${backendReportPeriod} report`);
      }

      setBackendDispatchSuccess(data.message || `Successfully sent ${backendReportPeriod} report to ${backendReportRecipient}`);
    } catch (err: any) {
      console.error(err);
      setBackendDispatchError(err.message || 'Failed to dispatch report');
    } finally {
      setIsBackendDispatching(false);
    }
  };

  const handleDispatchBackendAlert = async () => {
    if (!backendAlertSiteId) {
      setBackendAlertError('Please select a website to dispatch a test alert.');
      return;
    }

    setIsBackendAlerting(true);
    setBackendAlertSuccess(null);
    setBackendAlertError(null);

    const apiToken = localStorage.getItem('siteguard_token');

    try {
      const res = await fetch('/api/reports/trigger-test-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken || ''}`
        },
        body: JSON.stringify({
          websiteId: backendAlertSiteId,
          type: backendAlertState,
          recipient: backendAlertRecipient
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error dispatching test alert');
      }

      setBackendAlertSuccess(data.message || `Successfully sent test alert to ${backendAlertRecipient}`);
    } catch (err: any) {
      console.error(err);
      setBackendAlertError(err.message || 'Failed to dispatch test alert');
    } finally {
      setIsBackendAlerting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Google Authentication Box */}
      <div className="glass rounded-xl border border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600/15 border border-blue-500/20 text-blue-400 rounded-xl">
            <Cloud className="w-8 h-8 status-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-white">Google Workspace Auth Status</h3>
            <p className="text-xs text-slate-400 max-w-xl mt-1 leading-relaxed">
              Authenticate using your Google Workspace credentials to enable background file logging in Google Drive and direct email notification alerts via Gmail.
            </p>
            {user && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  Authorized as {user.displayName || user.email}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          {token ? (
            <button
              onClick={handleDisconnect}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-white/10"
            >
              Disconnect Account
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="gsi-material-button min-w-[200px]"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isConnecting ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 🚀 AUTOMATED SERVER NOTIFICATIONS & ANALYTICS REPORTS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          <h3 className="font-sans font-bold text-lg text-white">Automated Reports & Incident Triggers</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed -mt-2">
          SiteGuard performs periodic server-side tasks. Use these controls to manually dispatch automated health summaries or trigger test incident alerts to the administrator target (<span className="text-blue-400 font-mono font-medium">easterntechexpo@gmail.com</span>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: On-Demand Multi-Period Report Dispatching */}
          <div className="glass rounded-xl border border-white/10 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-blue-400 animate-pulse" />
                <h4 className="font-sans font-bold">Manual On-Demand AI Report Dispatcher</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate and email an advanced, multi-period AI health summary compiled with Gemini analysis directly to your mailbox or custom targets.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Report Generation Period
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setBackendReportPeriod(p)}
                        className={`py-1.5 text-[11px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                          backendReportPeriod === p
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Target Recipient Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="easterntechexpo@gmail.com (Default)"
                    value={backendReportRecipient}
                    onChange={(e) => setBackendReportRecipient(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {backendDispatchSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{backendDispatchSuccess}</span>
                </div>
              )}
              {backendDispatchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{backendDispatchError}</span>
                </div>
              )}

              <button
                onClick={handleDispatchBackendReport}
                disabled={isBackendDispatching}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBackendDispatching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Generate & Send {backendReportPeriod} report</span>
              </button>
            </div>
          </div>

          {/* Card 2: Simulated Site Downtime & Attention Alert */}
          <div className="glass rounded-xl border border-white/10 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h4 className="font-sans font-bold">Simulate Infrastructure Incident Trigger</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test the email alerting triggers immediately by simulating an attention requirement or recovery cycle for any of your registered systems.
              </p>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Website to Target
                    </label>
                    <select
                      value={backendAlertSiteId}
                      onChange={(e) => setBackendAlertSiteId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-medium text-slate-200 focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">-- Select Site --</option>
                      {websites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Simulation State
                    </label>
                    <div className="grid grid-cols-2 gap-1 h-[34px]">
                      {(['DOWN', 'RECOVERY'] as const).map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => setBackendAlertState(state)}
                          className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            backendAlertState === state
                              ? state === 'DOWN'
                                ? 'bg-red-600 text-white'
                                : 'bg-emerald-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Target Recipient Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="easterntechexpo@gmail.com (Default)"
                    value={backendAlertRecipient}
                    onChange={(e) => setBackendAlertRecipient(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {backendAlertSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{backendAlertSuccess}</span>
                </div>
              )}
              {backendAlertError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{backendAlertError}</span>
                </div>
              )}

              <button
                onClick={handleDispatchBackendAlert}
                disabled={isBackendAlerting || !backendAlertSiteId}
                className={`w-full py-2.5 text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                  backendAlertState === 'DOWN'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isBackendAlerting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Trigger Test {backendAlertState} Alert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {!token && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center text-slate-300">
          <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Google Integration Inactive</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Please authorize your Google account above to unlock automated reports, directory backups, and customized alert emails.
          </p>
        </div>
      )}

      {token && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Google Drive Card */}
          <div className="glass rounded-xl border border-white/10 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white">
                <FolderSync className="w-5 h-5 text-emerald-400" />
                <h4 className="font-sans font-bold">Google Drive Storage backups</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                SiteGuard automatically checks and creates dedicated folders on your Drive. Use this tool to instantly export your website registry as a machine-readable JSON backup.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {backupSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{backupSuccess}</span>
                </div>
              )}
              {driveError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-xs text-rose-400 font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{driveError}</span>
                </div>
              )}

              <button
                onClick={handleBackupSites}
                disabled={isBackingUp || websites.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving JSON backup...
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    Backup Site Registry to Drive
                  </>
                )}
              </button>

              <div className="text-[10px] text-slate-500 font-mono text-center pt-1 uppercase">
                Folder target: Google Drive / SiteGuard Backup
              </div>
            </div>
          </div>

          {/* Gmail Card */}
          <div className="glass rounded-xl border border-white/10 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-blue-400" />
                <h4 className="font-sans font-bold">Gmail API Outbound Testing</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test outbound email delivery directly from your personal Gmail account. This verifies security settings and network capabilities.
              </p>
            </div>

            {gmailSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{gmailSuccess}</span>
              </div>
            )}
            {gmailError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-xs text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{gmailError}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Website</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-sans text-slate-200"
                  >
                    <option value="">Select a site...</option>
                    {websites.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Alert State</label>
                  <select
                    value={testAlertType}
                    onChange={(e) => setTestAlertType(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-sans text-slate-200"
                  >
                    <option value="DOWN">DOWN 🚨</option>
                    <option value="RECOVERY">RECOVERED ✅</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Recipient Email</label>
                <input
                  type="email"
                  placeholder="alerts@domain.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleSendTestAlert}
                disabled={isSendingTest || !selectedSiteId || !recipientEmail}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending Test Alert via Gmail...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Test Gmail Alert
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Fleet Report Email */}
          <div className="glass rounded-xl border border-white/10 p-6 md:col-span-2 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-amber-400" />
                <h4 className="font-sans font-bold">Quick Infrastructure Fleet Summary</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compose and email a high-contrast HTML status summary of your entire monitored infrastructure to a customer or team member. This lists all systems, active alert statuses, and response latency statistics.
              </p>
            </div>

            {statusSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{statusSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="email"
                placeholder="recipient-manager@domain.com"
                value={statusRecipient}
                onChange={(e) => setStatusRecipient(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
              />
              <button
                onClick={handleSendStatusSummary}
                disabled={isSendingStatus || !statusRecipient || websites.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isSendingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Email Status Report</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
