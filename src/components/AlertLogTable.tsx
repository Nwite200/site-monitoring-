import React, { useState } from 'react';
import { MonitoringLog, Alert } from '../types';
import { AlertOctagon, RefreshCw, CheckCircle, Clock, ServerCrash, Search, Mail, MailCheck } from 'lucide-react';

interface AlertLogTableProps {
  logs: MonitoringLog[];
  alerts: Alert[];
  onRefresh: () => void;
  isLoading: boolean;
}

export default function AlertLogTable({ logs, alerts, onRefresh, isLoading }: AlertLogTableProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'logs'>('alerts');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logs or alerts
  const filteredAlerts = alerts.filter(alert => 
    alert.websiteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(log =>
    log.websiteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass rounded-xl border border-white/10 shadow-lg overflow-hidden animate-in fade-in duration-200">
      {/* Table Toolbar */}
      <div className="p-4 bg-white/5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Toggle tabs */}
        <div className="flex bg-white/5 border border-white/5 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'alerts' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Incidents & Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'logs' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Raw Telemetry Checks ({logs.length})
          </button>
        </div>

        {/* Search and refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search website..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-950/60 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 w-full sm:w-48"
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        {activeTab === 'alerts' ? (
          filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 status-pulse" />
              <p className="font-medium text-white">All Systems Nominal</p>
              <p className="text-xs text-slate-400 mt-1">No alert incidents recorded in this period.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Website</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Event</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Email Target</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Time Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white text-sm">{alert.websiteName}</div>
                      <div className="text-xs font-mono text-blue-400 truncate max-w-[200px]">{alert.url}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {alert.type === 'DOWN' ? (
                        <span className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/25 text-rose-400 font-semibold px-2.5 py-1 rounded-full text-xs">
                          <ServerCrash className="w-3.5 h-3.5" />
                          CRASHED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-semibold px-2.5 py-1 rounded-full text-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          RECOVERED
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300 font-medium max-w-xs truncate" title={alert.details}>
                      {alert.details}
                    </td>
                    <td className="px-5 py-3.5">
                      {alert.emailSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium" title={`Sent to ${alert.recipientEmail}`}>
                          <MailCheck className="w-3.5 h-3.5" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium" title="SMTP/Resend not set in server env, logged internally only">
                          <Mail className="w-3.5 h-3.5" />
                          Simulated
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" />
              <p className="font-medium text-white">Waiting for Telemetry...</p>
              <p className="text-xs text-slate-400 mt-1">No health checks recorded yet. Hit refresh or trigger check.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Website</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Latency</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Issue Description</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Checked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white text-sm">{log.websiteName}</div>
                      <div className="text-xs font-mono text-blue-400 truncate max-w-[200px]">{log.url}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {log.status === 'ONLINE' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                          ONLINE
                        </span>
                      ) : log.status === 'ERROR' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/25 text-amber-400 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                          ERROR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-500/15 border border-rose-500/25 text-rose-400 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                          OFFLINE
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-200">
                      {log.responseTime}ms
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium max-w-xs truncate">
                      {log.errorMessage || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                      {new Date(log.checkedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
