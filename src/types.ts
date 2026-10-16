export type SiteStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'PENDING';

export interface Website {
  id: string;
  name: string;
  url: string;
  clientName: string;
  contactEmail: string;
  monitoringInterval: number; // in minutes (e.g., 1, 5, 10, 15, 30, 60)
  enabled: boolean;
  status: SiteStatus;
  lastChecked?: string; // ISO date string
  lastResponseTime?: number; // in ms
  consecutiveFailures?: number;
  alertSent?: boolean;
  createdAt: string;
}

export interface MonitoringLog {
  id: string;
  websiteId: string;
  websiteName: string;
  url: string;
  status: SiteStatus;
  responseTime: number; // ms
  checkedAt: string; // ISO date string
  errorMessage?: string | null;
}

export interface Alert {
  id: string;
  websiteId: string;
  websiteName: string;
  url: string;
  type: 'DOWN' | 'RECOVERY';
  timestamp: string; // ISO date string
  details: string;
  emailSent: boolean;
  recipientEmail: string;
}

export interface DailyReport {
  id: string;
  date: string; // YYYY-MM-DD
  generatedAt: string; // ISO date string
  summary: string; // AI Markdown content
  healthScore: number; // 0-100
  totalChecks: number;
  uptimePercentage: number;
  slowRequestsCount: number;
  failuresCount: number;
}

export interface DashboardStats {
  totalWebsites: number;
  onlineWebsites: number;
  offlineWebsites: number;
  averageUptime: number; // percentage (e.g., 99.8)
  averageResponseTime: number; // ms
  writesSaved: number;
  recentLogs: MonitoringLog[];
  recentAlerts: Alert[];
  resendConfigured?: boolean;
}
