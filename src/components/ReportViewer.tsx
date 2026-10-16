import React, { useState } from 'react';
import { DailyReport } from '../types';
import Markdown from 'react-markdown';
import { 
  Calendar, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  TrendingUp, 
  Download, 
  Share2, 
  Send, 
  Check, 
  Loader2 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getGoogleAccessToken, googleSignIn } from '../lib/googleAuth';
import { ensureDriveFolder, uploadFileToDrive, sendGmailEmail } from '../lib/googleApis';

interface ReportViewerProps {
  report: DailyReport | null;
  onGenerateReport: () => void;
  isGenerating: boolean;
}

export default function ReportViewer({ report, onGenerateReport, isGenerating }: ReportViewerProps) {
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSaveSuccess, setDriveSaveSuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  if (!report) {
    return (
      <div className="glass rounded-xl border border-white/10 p-8 text-center max-w-2xl mx-auto my-12 shadow-md">
        <Cpu className="w-12 h-12 text-blue-400 mx-auto mb-4 status-pulse" />
        <h3 className="font-sans font-semibold text-xl text-white mb-2">
          No Health Report Generated Yet
        </h3>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Tk site guide Ai leverages Google Gemini to aggregate the last 24 hours of logs, analyze outages, calculate health metrics, and compile a professional recommendations report.
        </p>
        <button
          onClick={onGenerateReport}
          disabled={isGenerating}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-md transition-all inline-flex items-center gap-2 cursor-pointer neon-border-blue"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Gemini is analyzing telemetry...
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4" />
              Generate Daily AI Health Report
            </>
          )}
        </button>
      </div>
    );
  }

  // Determine health style
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (score >= 70) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  };

  const healthStyle = getHealthScoreColor(report.healthScore);

  const handleExportPDF = () => {
    if (!report) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let y = 20;

    // Helper for adding new page when needed
    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight - margin) {
        doc.addPage();
        // Draw header accent line on new pages
        doc.setFillColor(9, 13, 22);
        doc.rect(0, 0, pageWidth, 5, 'F');
        y = margin + 5;
      }
    };

    // Title Banner
    doc.setFillColor(9, 13, 22); // Dark background
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Tk site guide Ai', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(96, 165, 250); // Blue accent
    doc.text('AUTOMATED INFRASTRUCTURE MONITOR & DAILY HEALTH REPORT', margin, 25);

    // Subtle divider line in banner
    doc.setDrawColor(30, 41, 59);
    doc.line(margin, 29, pageWidth - margin, 29);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('GENERATED AUTOMATICALLY BY GOOGLE GEMINI DEVOPS ENGINE', margin, 34);

    y = 52;

    // Executive Summary Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('Executive Summary', margin, y);
    y += 6;

    // Background box for summary data
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600

    // Column 1
    doc.text('Date Generated:', margin + 6, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(report.generatedAt).toLocaleString(), margin + 6, y + 14);

    // Column 2
    doc.setFont('helvetica', 'bold');
    doc.text('Health Score:', margin + 70, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.healthScore} / 100`, margin + 70, y + 14);

    // Column 3
    doc.setFont('helvetica', 'bold');
    doc.text('Uptime %:', margin + 115, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.uptimePercentage}%`, margin + 115, y + 14);

    // Row 2 of table
    doc.setFont('helvetica', 'bold');
    doc.text('Total System Checks:', margin + 6, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.totalChecks} checks`, margin + 6, y + 27);

    doc.setFont('helvetica', 'bold');
    doc.text('Anomalies / Outages:', margin + 70, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.failuresCount} failures • ${report.slowRequestsCount} slow`, margin + 70, y + 27);

    y += 42;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Gemini Insights Heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Gemini AI Infrastructure Insights', margin, y);
    y += 8;

    // Body content - parse markdown line by line
    const lines = report.summary.split('\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700

    for (let line of lines) {
      line = line.trim();
      if (!line) {
        y += 4; // empty line spacing
        continue;
      }

      // Check for Headings
      if (line.startsWith('#')) {
        // Find how many #'s
        const level = (line.match(/^#+/) || [''])[0].length;
        const text = line.replace(/^#+\s*/, '');
        
        checkPageBreak(12);
        
        doc.setFont('helvetica', 'bold');
        if (level === 1) {
          doc.setFontSize(13);
          y += 4;
        } else if (level === 2) {
          doc.setFontSize(11.5);
          y += 3;
        } else {
          doc.setFontSize(10.5);
          y += 2;
        }
        
        doc.setTextColor(15, 23, 42); // Dark slate
        doc.text(text, margin, y);
        
        if (level === 1) {
          y += 7;
        } else {
          y += 5.5;
        }
        
        // Reset font
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        continue;
      }

      // Check for Bullet points
      let isBullet = false;
      let cleanText = line;
      let bulletChar = '•';
      if (line.startsWith('* ') || line.startsWith('- ')) {
        isBullet = true;
        cleanText = line.substring(2);
      } else if (/^\d+\.\s+/.test(line)) {
        isBullet = true;
        const match = line.match(/^(\d+\.\s+)/);
        if (match) {
          bulletChar = match[1];
          cleanText = line.substring(bulletChar.length);
        }
      }

      // Strip bold markers (**text** or __text__)
      cleanText = cleanText.replace(/\*\*|__/g, '');

      // Split text to fit page width
      const indent = isBullet ? 6 : 0;
      const splitLines = doc.splitTextToSize(cleanText, contentWidth - indent);

      for (let i = 0; i < splitLines.length; i++) {
        checkPageBreak(6);
        
        if (isBullet && i === 0) {
          // Draw bullet character
          doc.setFont('helvetica', 'bold');
          doc.text(bulletChar, margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(splitLines[i], margin + indent, y);
        } else {
          doc.text(splitLines[i], margin + indent, y);
        }
        y += 5.5;
      }
    }

    // Add page numbers and footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      // Footer line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      // Page count and footer text
      doc.text(`Tk site guide Ai • Daily DevSecOps Health Report`, margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 10);
    }

    // Save PDF
    const filename = `tk_site_guide_report_${report.generatedAt.split('T')[0] || Date.now()}.pdf`;
    doc.save(filename);
  };

  const handleSaveToDrive = async () => {
    setIsSavingToDrive(true);
    setDriveSaveSuccess(false);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) {
          setIsSavingToDrive(false);
          return;
        }
        token = result.accessToken;
      }
      
      const folderId = await ensureDriveFolder(token, 'SiteGuard Reports');
      const dateStr = report.generatedAt.split('T')[0] || new Date().toISOString().split('T')[0];
      const fileName = `siteguard_report_${dateStr}.md`;
      
      const markdownContent = `# SiteGuard AI Daily Health Report\n` +
        `**Generated on:** ${new Date(report.generatedAt).toLocaleString()}\n` +
        `**Health Score:** ${report.healthScore}/100\n` +
        `**Uptime Percentage:** ${report.uptimePercentage}%\n` +
        `**Total Checks:** ${report.totalChecks} checks\n` +
        `**Anomalies:** ${report.failuresCount} failures • ${report.slowRequestsCount} slow\n\n` +
        `---\n\n` +
        report.summary;
        
      await uploadFileToDrive(token, fileName, markdownContent, 'text/markdown', folderId);
      setDriveSaveSuccess(true);
      setTimeout(() => setDriveSaveSuccess(false), 4000);
    } catch (error: any) {
      console.error('Failed to save report to Google Drive:', error);
      alert('Failed to save to Google Drive: ' + error.message);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleSendGmail = async () => {
    if (!recipientEmail) {
      alert('Please enter a recipient email address.');
      return;
    }
    
    setIsSendingEmail(true);
    setEmailSuccess(false);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) {
          setIsSendingEmail(false);
          return;
        }
        token = result.accessToken;
      }
      
      const subject = `SiteGuard AI Daily Health Report - ${report.generatedAt.split('T')[0]}`;
      
      // Basic HTML formatting for report
      const bodyHtml = `
        <div style="font-family: sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0; font-family: system-ui, sans-serif;">SiteGuard AI Daily Health Report</h2>
          <p style="font-size: 14px; color: #64748b;">Generated automatically on <strong>${new Date(report.generatedAt).toLocaleString()}</strong></p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #475569; border-bottom: 1px solid #f1f5f9;"><strong>Health Score:</strong></td>
                <td style="padding: 6px 0; color: #10b981; font-weight: bold; border-bottom: 1px solid #f1f5f9; text-align: right;">${report.healthScore} / 100</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569; border-bottom: 1px solid #f1f5f9;"><strong>Uptime:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9; text-align: right;">${report.uptimePercentage}%</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569; border-bottom: 1px solid #f1f5f9;"><strong>Total Checks:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; border-bottom: 1px solid #f1f5f9; text-align: right;">${report.totalChecks} checks</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569; text-align: left;"><strong>Incidents:</strong></td>
                <td style="padding: 6px 0; color: #ef4444; text-align: right;">${report.failuresCount} failures / ${report.slowRequestsCount} slow</td>
              </tr>
            </table>
          </div>
          
          <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">AI DevSecOps Insights</h3>
          <div style="line-height: 1.6; font-size: 14px; color: #334155; white-space: pre-wrap;">
            ${report.summary.replace(/#/g, '').replace(/\n\n/g, '<br/><br/>')}
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">Sent directly via SiteGuard Google Workspace integration.</p>
        </div>
      `;
      
      await sendGmailEmail(token, recipientEmail, subject, bodyHtml);
      setEmailSuccess(true);
      setShowEmailPrompt(false);
      setRecipientEmail('');
      setTimeout(() => setEmailSuccess(false), 4000);
    } catch (error: any) {
      console.error('Failed to send email via Gmail:', error);
      alert('Failed to send email: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Report Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Main Title Card */}
        <div className="md:col-span-2 glass neon-border-blue rounded-xl p-5 border border-white/10 flex flex-col justify-between text-white shadow-sm">
          <div className="flex items-start justify-between flex-col xl:flex-row xl:items-center gap-3 w-full">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400">Tk site guide Ai Core</span>
              <h3 className="font-sans font-semibold text-xl mt-1">Daily Health Report</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-xs"
                title="Export report to PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>

              <button
                onClick={handleSaveToDrive}
                disabled={isSavingToDrive}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-xs ${
                  driveSaveSuccess
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10 hover:border-white/25'
                }`}
                title="Save markdown report to Google Drive"
              >
                {isSavingToDrive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : driveSaveSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] text-emerald-400">GD</span>
                )}
                <span>{driveSaveSuccess ? 'Saved' : isSavingToDrive ? 'Saving...' : 'Save Drive'}</span>
              </button>

              <button
                onClick={() => setShowEmailPrompt(!showEmailPrompt)}
                className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-xs ${
                  emailSuccess
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10 hover:border-white/25'
                }`}
                title="Email report to contact via Gmail"
              >
                {emailSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{emailSuccess ? 'Sent' : 'Gmail'}</span>
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
            <div>
              <p className="text-xs text-slate-400">Generated on</p>
              <p className="font-mono text-sm text-slate-200">{new Date(report.generatedAt).toLocaleString()}</p>
            </div>
            <Calendar className="w-5 h-5 text-blue-400 hidden sm:block shrink-0" />
          </div>

          {showEmailPrompt && (
            <div className="mt-4 p-3 bg-slate-900/60 border border-white/10 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
              <button
                onClick={handleSendGmail}
                disabled={isSendingEmail}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {isSendingEmail ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Send</span>
              </button>
              <button
                onClick={() => setShowEmailPrompt(false)}
                className="px-2 py-1.5 text-slate-400 hover:text-white text-xs shrink-0"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Health Score Card */}
        <div className={`rounded-xl p-5 border ${healthStyle.border} ${healthStyle.bg} shadow-sm flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Health Score</span>
            <Award className={`w-5 h-5 ${healthStyle.text}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-4xl font-mono font-bold ${healthStyle.text}`}>{report.healthScore}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Weighted by outages & response times
          </div>
        </div>

        {/* 24h Telemetry Stats */}
        <div className="glass rounded-xl p-5 border border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Checks & Uptime</span>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{report.uptimePercentage}%</span>
              <span className="text-xs text-slate-400">uptime</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1 items-center">
              <CheckCircle className="w-3 h-3 text-emerald-400 inline" />
              <span>{report.totalChecks} checks • {report.failuresCount} downs • {report.slowRequestsCount} slow</span>
            </div>
          </div>
          <button
            onClick={onGenerateReport}
            disabled={isGenerating}
            className="mt-3 text-[11px] font-semibold text-blue-400 hover:text-blue-300 text-left transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? 'Refreshing...' : 'Re-generate Analysis'}
          </button>
        </div>
      </div>

      {/* AI Markdown Body */}
      <div className="glass rounded-xl border border-white/10 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
          <div className="p-1.5 bg-blue-600/15 border border-blue-500/20 text-blue-400 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-white">Gemini Infrastructure Insights</h4>
            <p className="text-xs text-slate-400">Complete architectural audit and possible root causes</p>
          </div>
        </div>

        {/* Render markdown using react-markdown inside div class markdown-body */}
        <div className="markdown-body prose max-w-none text-slate-300 space-y-4 prose-headings:font-sans prose-headings:font-bold prose-headings:text-white prose-strong:text-white prose-code:font-mono prose-code:text-xs prose-code:bg-slate-950/60 prose-code:text-blue-300 prose-code:p-1 prose-code:rounded prose-code:border prose-code:border-white/5">
          <Markdown>{report.summary}</Markdown>
        </div>
      </div>
    </div>
  );
}
