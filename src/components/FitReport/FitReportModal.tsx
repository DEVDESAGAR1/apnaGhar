import React, { useState } from 'react';
import type { FitReport, FitStatus, CheckCategory, FurnitureItem } from '../../types/model';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  ShieldAlert, 
  Copy, 
  Check, 
  ArrowRight
} from 'lucide-react';

interface FitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: FitReport;
  furniture: FurnitureItem[];
  onSelectItem: (itemId: string) => void;
  onConfirmItem: (itemId: string) => void;
}

export const FitReportModal: React.FC<FitReportModalProps> = ({
  isOpen,
  onClose,
  report,
  furniture,
  onSelectItem,
  onConfirmItem,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterCategory, setFilterCategory] = useState<CheckCategory | 'all'>('all');

  if (!isOpen) return null;

  const filteredChecks = filterCategory === 'all'
    ? report.checks
    : report.checks.filter(c => c.category === filterCategory);

  const getStatusBadge = (status: FitStatus) => {
    switch (status) {
      case 'PASS':
        return <span className="badge-pass" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>PASS</span>;
      case 'FAIL':
        return <span className="badge-fail" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>FAIL</span>;
      case 'REVIEW':
        return <span className="badge-review" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>REVIEW</span>;
      case 'NOT_CHECKED':
        return <span className="badge-not-checked" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>NOT CHECKED</span>;
    }
  };

  const handleCopyReport = () => {
    const text = [
      `# ApnaGhar (अपना घर) — Spatial Fit Validation Report`,
      `Overall Status: ${report.overallStatus}`,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Summary: ${report.summary.passCount} PASS, ${report.summary.failCount} FAIL, ${report.summary.reviewCount} REVIEW, ${report.summary.notCheckedCount} NOT CHECKED`,
      ``,
      `## Detailed Checks`,
      ...report.checks.map(c => `[${c.status}] ${c.title}\n${c.description}\nRemedy: ${c.remedyRecommendation || 'None needed'}\n`),
      `## Legal Disclaimer`,
      report.disclaimer,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 760px)', height: 'min(88vh, 800px)' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Fit Validation Report
            </h2>
            {getStatusBadge(report.overallStatus)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyReport}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mandatory Disclaimer Banner */}
        <div style={{
          margin: '16px 20px 0',
          padding: '12px 14px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <ShieldAlert size={18} className="text-rose-400" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.775rem', color: '#fda4af', lineHeight: 1.45, margin: 0 }}>
            <strong>Safety & Code Notice:</strong> {report.disclaimer}
          </p>
        </div>

        {/* Summary Badges Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          padding: '16px 20px 8px',
        }}>
          <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PASS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{report.summary.passCount}</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FAIL</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185' }}>{report.summary.failCount}</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REVIEW</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>{report.summary.reviewCount}</div>
          </div>
          <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NOT CHECKED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#cbd5e1' }}>{report.summary.notCheckedCount}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '4px 20px 10px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {(['all', 'room-boundary', 'furniture-collision', 'door-clearance', 'functional-clearance', 'measurement-confidence'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: filterCategory === cat ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: filterCategory === cat ? '#38bdf8' : 'var(--text-muted)',
              }}
            >
              {cat === 'all' ? 'All Checks' : cat.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Checks List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredChecks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
              No checks match this category.
            </div>
          ) : (
            filteredChecks.map(check => {
              const affectedItems = furniture.filter(f => check.affectedItemIds.includes(f.id));

              return (
                <div
                  key={check.id}
                  className="glass-panel"
                  style={{
                    padding: '14px',
                    borderColor: check.status === 'FAIL' ? 'rgba(244, 63, 94, 0.35)' : check.status === 'REVIEW' ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {check.status === 'PASS' && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {check.status === 'FAIL' && <XCircle size={16} className="text-rose-400" />}
                      {check.status === 'REVIEW' && <AlertTriangle size={16} className="text-amber-400" />}
                      {check.status === 'NOT_CHECKED' && <HelpCircle size={16} className="text-slate-400" />}
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{check.title}</span>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>

                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {check.description}
                  </p>

                  {check.details && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      {check.details}
                    </div>
                  )}

                  {check.remedyRecommendation && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <ArrowRight size={13} className="text-sky-400" />
                      <span>{check.remedyRecommendation}</span>
                    </div>
                  )}

                  {/* Affected Items Chips */}
                  {affectedItems.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Affected:</span>
                      {affectedItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => {
                              onSelectItem(item.id);
                              onClose();
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
                            title="Focus in 2D Plan"
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                            <span>{item.name}</span>
                          </button>
                          {!item.isConfirmed && (
                            <button
                              onClick={() => onConfirmItem(item.id)}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.675rem', padding: '2px 6px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                              title="Mark dimension as confirmed"
                            >
                              Confirm
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
