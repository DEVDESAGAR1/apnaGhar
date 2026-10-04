import React, { useState } from 'react';
import type { FitProject, FitReport, UnitType } from '../../types/model';
import { 
  exportProjectJson, 
  importProjectJson, 
  createSampleDemoProject 
} from '../../utils/storage';
import { formatDimension } from '../../utils/units';
import { 
  X, 
  Download, 
  Upload, 
  ShieldCheck, 
  Check, 
  Copy, 
  Printer 
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FitProject;
  fitReport: FitReport;
  displayUnit: UnitType;
  onLoadProject: (newProject: FitProject) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  fitReport,
  displayUnit,
  onLoadProject,
}) => {
  const [includePhoto, setIncludePhoto] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'report' | 'demos'>('export');

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const jsonStr = exportProjectJson(project, includePhoto);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-plan.fitcheck.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    const jsonStr = exportProjectJson(project, includePhoto);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importProjectJson(text);
        onLoadProject(imported);
        onClose();
      } catch (err: any) {
        alert(err.message || 'Failed to import project file.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 680px)', height: 'min(88vh, 760px)' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Export, Share & Demo Plans
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <button
            onClick={() => setActiveTab('export')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'export' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'export' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Export Plan
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'report' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'report' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Printable Report
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'import' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'import' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Import File
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'demos' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'demos' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Demo Rooms
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Privacy Notice Box */}
              <div className="glass-panel" style={{ padding: '14px', borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 600, fontSize: '0.875rem' }}>
                  <ShieldCheck size={18} />
                  <span>Privacy-Safe Export by Default</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#a7f3d0', marginTop: '6px', lineHeight: 1.45 }}>
                  By default, any uploaded room photograph is stripped from the exported file so you can safely share your furniture arrangement with friends, landlords, or contractors without revealing personal living spaces.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includePhoto}
                    onChange={e => setIncludePhoto(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-main)' }}>
                    Include room photograph in export file (Explicit Opt-in)
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleDownloadJson}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  <Download size={16} />
                  <span>Download .fitcheck.json</span>
                </button>
                <button
                  onClick={handleCopyJson}
                  className="btn btn-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              {/* Preview Info */}
              <div className="glass-panel" style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>Project Summary</div>
                <div>Room: {project.room.name} ({project.room.width} × {project.room.length} cm)</div>
                <div>Furniture Count: {project.furniture.length} items</div>
                <div>Overall Fit Status: <strong style={{ color: fitReport.overallStatus === 'PASS' ? '#34d399' : '#fbbf24' }}>{fitReport.overallStatus}</strong></div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Print or save as PDF client-ready summary
                </span>
                <button onClick={handlePrintSummary} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  <Printer size={15} />
                  <span>Print / Save PDF</span>
                </button>
              </div>

              {/* Printable Document Preview */}
              <div style={{
                background: '#ffffff',
                color: '#0f172a',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0284c7' }}>FitCheck Space Plan</h1>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Project: {project.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Status: {fitReport.overallStatus}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>Room Dimensions</h3>
                  <div>Width: {formatDimension(project.room.width, displayUnit)}</div>
                  <div>Length: {formatDimension(project.room.length, displayUnit)}</div>
                  <div>Ceiling Height: {formatDimension(project.room.height, displayUnit)}</div>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>Furniture Inventory</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.775rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Dimensions</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Provenance</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.furniture.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '6px' }}>{formatDimension(item.width, displayUnit, false)} × {formatDimension(item.depth, displayUnit, false)} × {formatDimension(item.height, displayUnit)}</td>
                        <td style={{ padding: '6px' }}>{item.provenance}</td>
                        <td style={{ padding: '6px' }}>{item.isConfirmed ? 'Yes' : 'No (Estimate)'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '4px', fontSize: '0.75rem', color: '#991b1b', lineHeight: 1.4 }}>
                  <strong>Disclaimer:</strong> {fitReport.disclaimer}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Upload size={32} className="text-sky-400" />
                <div style={{ fontWeight: 600 }}>Choose a .fitcheck.json project file</div>
                <input
                  type="file"
                  accept=".json,.fitcheck.json"
                  onChange={handleImportFile}
                  style={{ display: 'block', margin: '0 auto', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'demos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Instant demo templates to test 2D/3D layouts and fit verification:
              </p>

              {[
                { id: 'living', name: 'Scandi Living Room', desc: '480×560 cm room with sofa, coffee table, media unit, armchair & door swing' },
                { id: 'bedroom', name: 'Master Bedroom', desc: '340×420 cm room with Queen bed, nightstand, and study desk' },
                { id: 'office', name: 'Home Studio & Office', desc: '320×360 cm workspace with standing desk, bookcase, and indoor plants' },
              ].map(demo => (
                <div
                  key={demo.id}
                  className="glass-panel"
                  style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{demo.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{demo.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      const sample = createSampleDemoProject(demo.id as any);
                      onLoadProject(sample);
                      onClose();
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    Load Demo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
