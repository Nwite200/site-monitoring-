import React, { useState, useEffect } from 'react';
import { Website } from '../types';
import { X, Globe, Clock, ShieldCheck } from 'lucide-react';

interface WebsiteFormProps {
  website?: Website | null;
  onSave: (data: Omit<Website, 'id' | 'status' | 'consecutiveFailures' | 'alertSent' | 'createdAt'>) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function WebsiteForm({ website, onSave, onClose, isLoading }: WebsiteFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [monitoringInterval, setMonitoringInterval] = useState(5);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (website) {
      setName(website.name);
      setUrl(website.url);
      setMonitoringInterval(website.monitoringInterval);
      setEnabled(website.enabled);
    }
  }, [website]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      alert("Website name and URL are required.");
      return;
    }
    onSave({
      name: name.trim(),
      url: url.trim(),
      clientName: 'Admin',
      contactEmail: 'vresounding@gmail.com',
      monitoringInterval,
      enabled
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl shadow-2xl border border-white/10 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 neon-border-blue">
        <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="font-sans font-semibold text-lg text-white">
              {website ? 'Edit Monitored Website' : 'Add Website for Monitoring'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Website Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Globe className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="e.g. Acme Corporation Portal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              URL Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-mono text-xs select-none">
                http://
              </span>
              <input
                type="text"
                placeholder="clientsite.com or https://clientsite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full pl-16 pr-4 py-2 bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono text-sm"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Supports both standard HTTP and secure HTTPS addresses.
            </p>
          </div>



          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Monitoring Interval
              </label>
              <select
                value={monitoringInterval}
                onChange={(e) => setMonitoringInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer [&>option]:bg-slate-950 [&>option]:text-white"
              >
                <option value={1}>1 Minute (Real-time)</option>
                <option value={2}>2 Minutes (Optimized)</option>
                <option value={5}>5 Minutes (Default)</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (Hourly)</option>
              </select>
            </div>

            <div className="flex items-center justify-start h-full pt-6">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-transparent after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                <span className="ml-3 text-sm font-medium text-slate-300">
                  Enable Active Monitoring
                </span>
              </label>
            </div>
          </div>

          <div className="px-6 py-4 bg-white/5 -mx-6 -mb-6 mt-6 flex justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer neon-border-blue"
            >
              <ShieldCheck className="w-4 h-4" />
              {isLoading ? 'Saving changes...' : website ? 'Save Updates' : 'Start Safeguarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
