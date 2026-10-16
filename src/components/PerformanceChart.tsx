import React, { useState, useEffect } from 'react';
import { Website } from '../types';
import { getApiUrl } from '../lib/api';
import { 
  Activity, 
  Clock, 
  ShieldCheck, 
  RotateCw, 
  BarChart2,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface PerformanceChartProps {
  websites: Website[];
}

interface ChartDataPoint {
  label: string;
  responseTime: number;
  uptime: number;
  checksCount: number;
  failuresCount: number;
}

const SITE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#eab308', // yellow
];

const getColorForSite = (siteId: string, index: number) => {
  if (siteId === 'all') return '#3b82f6';
  return SITE_COLORS[index % SITE_COLORS.length];
};

export default function PerformanceChart({ websites }: PerformanceChartProps) {
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>(['all']);
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [metric, setMetric] = useState<'speed' | 'uptime'>('speed');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('siteguard_token');
      const headers = { 'Authorization': token ? `Bearer ${token}` : '' };

      const activeIds = selectedSiteIds.includes('all') ? ['all'] : selectedSiteIds;

      // Fetch telemetry data for each selected ID in parallel
      const promises = activeIds.map(async (id) => {
        const response = await fetch(getApiUrl(`/api/performance?websiteId=${id}&range=${range}`), { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch performance telemetry for site ${id}`);
        }
        const resData = await response.json();
        return { id, name: resData.websiteName, data: resData.data };
      });

      const results = await Promise.all(promises);

      if (results.length === 0) {
        setChartData([]);
        return;
      }

      // Merge data points by label (hour, day, etc.)
      const firstResult = results[0];
      const merged = firstResult.data.map((item: any, index: number) => {
        const point: any = { label: item.label };
        results.forEach((res) => {
          const siteDataPoint = res.data[index] || item;
          point[`speed_${res.id}`] = siteDataPoint.responseTime;
          point[`uptime_${res.id}`] = siteDataPoint.uptime;
          point[`checks_${res.id}`] = siteDataPoint.checksCount;
          point[`failures_${res.id}`] = siteDataPoint.failuresCount;
        });
        return point;
      });

      setChartData(merged);
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with telemetry server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedSiteIds, range]);

  const activeIds = selectedSiteIds.includes('all') ? ['all'] : selectedSiteIds;

  // Custom tooltips to match our neon slate dark styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-white/10 rounded-xl p-3.5 shadow-xl backdrop-blur-md max-w-xs sm:max-w-sm">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {payload.map((item: any, idx: number) => {
              const isSpeed = metric === 'speed';
              return (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: item.color || item.stroke }}
                    />
                    <span className="text-xs text-slate-300 font-sans truncate max-w-[130px] sm:max-w-[180px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">
                    {isSpeed ? `${item.value} ms` : `${item.value}%`}
                  </span>
                </div>
              );
            })}
          </div>
          {payload.length === 1 && payload[0]?.payload && (
            <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] text-slate-500 font-mono">
              Checks Run: {payload[0].payload[`checks_${activeIds[0]}`] || 0} • Failed: {payload[0].payload[`failures_${activeIds[0]}`] || 0}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate dynamic summary stats across all selected sites
  let peakVal = '-';
  let avgVal = '-';
  let healthLabel = 'HEALTHY';

  if (!isLoading && !error && chartData.length > 0) {
    const isSpeed = metric === 'speed';
    const activeKeys = activeIds.map(id => `${metric === 'speed' ? 'speed' : 'uptime'}_${id}`);
    
    const allValues: number[] = [];
    chartData.forEach(d => {
      activeKeys.forEach(k => {
        if (typeof d[k] === 'number') {
          allValues.push(d[k]);
        }
      });
    });

    if (allValues.length > 0) {
      if (isSpeed) {
        const validSpeeds = allValues.filter(v => v > 0);
        const minSpeed = Math.min(...validSpeeds);
        peakVal = minSpeed !== Infinity ? `${minSpeed} ms` : '-';
        
        const avgSpeed = Math.round(validSpeeds.reduce((acc, c) => acc + c, 0) / validSpeeds.length);
        avgVal = `${avgSpeed} ms`;
        
        healthLabel = avgSpeed < 200 ? 'EXCELLENT' : avgSpeed < 450 ? 'HEALTHY' : 'DEGRADED';
      } else {
        const maxUptime = Math.max(...allValues);
        peakVal = `${maxUptime}%`;
        
        const avgUptime = parseFloat((allValues.reduce((acc, c) => acc + c, 0) / allValues.length).toFixed(2));
        avgVal = `${avgUptime}%`;
        
        healthLabel = avgUptime >= 99 ? 'EXCELLENT' : avgUptime >= 95 ? 'HEALTHY' : 'DEGRADED';
      }
    }
  }

  return (
    <div className="glass neon-border-blue rounded-2xl p-6 border border-white/10 text-white shadow-xl">
      {/* Header Controllers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-sans font-bold text-lg text-white tracking-tight">Performance Telemetry</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time latency profiling and uptime logs. Toggle multiple websites to compare trends.
          </p>
        </div>

        {/* Dropdowns & Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector (Speed vs Uptime) */}
          <div className="bg-slate-950/40 p-1 border border-white/10 rounded-xl flex">
            <button
              onClick={() => setMetric('speed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                metric === 'speed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Response Time</span>
            </button>
            <button
              onClick={() => setMetric('uptime')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                metric === 'uptime'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Uptime %</span>
            </button>
          </div>
        </div>
      </div>

      {/* Website Multi-Select Row */}
      <div className="bg-slate-950/30 rounded-xl p-3 border border-white/5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Select websites to compare:</span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedSiteIds(websites.map(w => w.id))}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-mono uppercase tracking-wider transition-all hover:underline cursor-pointer"
            >
              [Compare All]
            </button>
            <button
              onClick={() => setSelectedSiteIds(['all'])}
              className="text-[10px] text-slate-400 hover:text-slate-300 font-mono uppercase tracking-wider transition-all hover:underline cursor-pointer"
            >
              [Reset to Aggregated]
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* 'All Sites' Pill */}
          <button
            onClick={() => setSelectedSiteIds(['all'])}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedSiteIds.includes('all')
                ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            All Sites (Aggregated)
          </button>

          {/* Individual Website Pills */}
          {websites.map((site, idx) => {
            const isSelected = selectedSiteIds.includes(site.id);
            const color = getColorForSite(site.id, idx);
            return (
              <button
                key={site.id}
                onClick={() => {
                  let updated: string[];
                  if (selectedSiteIds.includes('all')) {
                    updated = [site.id];
                  } else if (isSelected) {
                    updated = selectedSiteIds.filter(id => id !== site.id);
                    if (updated.length === 0) {
                      updated = ['all'];
                    }
                  } else {
                    updated = [...selectedSiteIds, site.id];
                  }
                  setSelectedSiteIds(updated);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-950 text-white font-bold'
                    : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
                style={isSelected ? { borderColor: color, boxShadow: `0 0 6px ${color}20` } : {}}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="truncate max-w-[120px]">{site.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interval Navigator */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all ${
                range === r
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          onClick={fetchPerformanceData}
          className="p-2 bg-slate-950/60 hover:bg-slate-950 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Refresh Telemetry Chart"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>

      {/* Graph Area */}
      <div className="relative h-[320px] w-full bg-slate-950/30 rounded-xl border border-white/5 p-4 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              Fetching Telemetry Sequence...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto gap-2">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
            <p className="text-sm font-semibold text-white">Telemetry Sync Offline</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 text-slate-400">
            <BarChart2 className="w-8 h-8 text-slate-600" />
            <p className="text-xs">No monitoring metrics logged yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeIds.length === 1 ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getColorForSite(activeIds[0], websites.findIndex(w => w.id === activeIds[0]))} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getColorForSite(activeIds[0], websites.findIndex(w => w.id === activeIds[0]))} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  axisLine={false}
                  domain={metric === 'uptime' ? [90, 100] : undefined}
                  tickFormatter={(val) => metric === 'speed' ? `${val}ms` : `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey={`${metric === 'speed' ? 'speed' : 'uptime'}_${activeIds[0]}`} 
                  name={activeIds[0] === 'all' ? 'All Sites (Aggregated)' : (websites.find(w => w.id === activeIds[0])?.name || 'Website')}
                  stroke={getColorForSite(activeIds[0], websites.findIndex(w => w.id === activeIds[0]))} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#speedGradient)" 
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  axisLine={false}
                  domain={metric === 'uptime' ? [90, 100] : undefined}
                  tickFormatter={(val) => metric === 'speed' ? `${val}ms` : `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4 text-xs font-medium">
                      {payload?.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
                {activeIds.map(id => {
                  const idx = websites.findIndex(w => w.id === id);
                  const color = getColorForSite(id, idx);
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`${metric === 'speed' ? 'speed' : 'uptime'}_${id}`}
                      name={websites.find(w => w.id === id)?.name || id}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  );
                })}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Meta Indicators */}
      {!isLoading && !error && chartData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/5 font-sans">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              {metric === 'speed' ? 'Peak Speed' : 'Peak Uptime'}
            </p>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {peakVal}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-medium">
              Average ({activeIds.length > 1 ? 'Across Selected' : 'Overall'})
            </p>
            <p className="text-lg font-bold font-mono text-blue-400 mt-0.5">
              {avgVal}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-medium">
              Overall Status
            </p>
            <p className="text-lg font-bold font-mono text-indigo-400 mt-0.5 uppercase">
              {healthLabel}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
