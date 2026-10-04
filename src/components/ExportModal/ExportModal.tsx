import React, { useState } from 'react';
import type { HomeProject, FitReport, UnitType } from '../../types/model';
import { 
  exportProjectJson, 
  importProjectJson, 
  createSampleHomeProject 
} from '../../utils/storage';
import { formatDimension } from '../../utils/units';
import { 
  X, 
  Download, 
  Upload, 
  ShieldCheck, 
  Check, 
  Copy, 
  Printer,
  Home
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: HomeProject;
  fitReport: FitReport;
  displayUnit: UnitType;
  onLoadProject: (newProject: HomeProject) => void;
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
  const [activeTab, setActiveTab] = useState<'export' | 'report' | 'import' | 'demos'>('export');

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const jsonStr = exportProjectJson(project, includePhoto);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-apnaghar.json`;
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

  // Compute aggregate home statistics
  const totalAreaSqM = Math.round(
    project.rooms.reduce((acc, r) => acc + (r.width * r.length) / 10000, 0) * 10
  ) / 10;
  const totalFurnitureCount = project.rooms.reduce((acc, r) => acc + (r.furniture?.length || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 720px)', height: 'min(88vh, 800px)' }}
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
            <Home size={20} className="text-terracotta" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                Export, Share & Printable Reports
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                ApnaGhar (अपना घर) — Privacy-Preserving Home Planning
              </p>
            </div>
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
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'export' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'export' ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === 'export' ? 600 : 400,
            }}
          >
            Export Project
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'report' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'report' ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === 'report' ? 600 : 400,
            }}
          >
            Printable Report
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'import' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'import' ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === 'import' ? 600 : 400,
            }}
          >
            Import File
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'demos' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'demos' ? '#fff' : 'var(--text-muted)',
              fontWeight: activeTab === 'demos' ? 600 : 400,
            }}
          >
            Home Templates
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Privacy-First Export Guarantee</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  By default, any uploaded room photographs are stripped from exported files to prevent accidentally leaking private home imagery.
                  The exported file contains only geometric vectors, room dimensions, material finishes, and spatial fit evaluations.
                </p>

                {project.photoContext.hasPhoto && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '0.825rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includePhoto}
                      onChange={e => setIncludePhoto(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: includePhoto ? 'var(--warning-amber)' : 'var(--text-muted)' }}>
                      Explicitly include room photo in export (Warning: creates large file with private image)
                    </span>
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleDownloadJson}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                >
                  <Download size={16} />
                  Download .apnaghar.json
                </button>
                <button
                  onClick={handleCopyJson}
                  className="btn btn-ghost"
                  style={{ padding: '12px 18px', border: '1px solid var(--border-medium)' }}
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                maxHeight: '180px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {exportProjectJson(project, includePhoto).slice(0, 1200)}...
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Comprehensive Home & Room Space Plan</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for client presentations, contractor review, or print</div>
                </div>
                <button
                  onClick={handlePrintSummary}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                >
                  <Printer size={15} />
                  Print / Save as PDF
                </button>
              </div>

              {/* Printable Document Paper */}
              <div style={{
                background: '#ffffff',
                color: '#1e293b',
                padding: '28px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '18px' }}>
                  <div>
                    <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#b45309' }}>
                      ApnaGhar (अपना घर) — Home Space Plan
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                      Project: {project.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {project.floors.length} Floor{project.floors.length !== 1 ? 's' : ''} • {project.rooms.length} Room{project.rooms.length !== 1 ? 's' : ''} • Total Area: {totalAreaSqM} m² • {totalFurnitureCount} Furniture Items
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: fitReport.overallStatus === 'PASS' ? '#059669' : '#dc2626' }}>
                      Status: {fitReport.overallStatus}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Rooms Breakdown */}
                {project.rooms.map((rm, idx) => {
                  const floorName = project.floors.find(f => f.id === rm.floorId)?.name || 'Ground Floor';
                  const areaM = Math.round(((rm.width * rm.length) / 10000) * 10) / 10;
                  return (
                    <div key={rm.id} style={{ marginBottom: '22px', borderBottom: idx < project.rooms.length - 1 ? '1px dashed #cbd5e1' : 'none', paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                            {rm.name}
                          </span>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                            {floorName} • {rm.type}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {formatDimension(rm.width, displayUnit, false)} × {formatDimension(rm.length, displayUnit)} ({areaM} m²)
                        </div>
                      </div>

                      {rm.finishes && (
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px' }}>
                          <strong>Interior Finishes:</strong> Wall: {rm.finishes.wallColor} ({rm.finishes.wallFinish}) • Floor: {rm.finishes.floorType.replace('_', ' ')} ({rm.finishes.floorColor})
                        </div>
                      )}

                      {/* Furniture Table for Room */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '0.775rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ textAlign: 'left', padding: '6px' }}>Furniture Item</th>
                            <th style={{ textAlign: 'left', padding: '6px' }}>Dimensions (W×D×H)</th>
                            <th style={{ textAlign: 'left', padding: '6px' }}>Provenance</th>
                            <th style={{ textAlign: 'left', padding: '6px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rm.furniture || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>No furniture placed in this room yet.</td>
                            </tr>
                          ) : (
                            (rm.furniture || []).map(item => (
                              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px', fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: '6px' }}>
                                  {formatDimension(item.width, displayUnit, false)} × {formatDimension(item.depth, displayUnit, false)} × {formatDimension(item.height, displayUnit)}
                                </td>
                                <td style={{ padding: '6px' }}>{item.provenance}</td>
                                <td style={{ padding: '6px' }}>{item.isConfirmed ? '✓ Confirmed' : '⚠ Estimated'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                <div style={{ background: '#fee2e2', padding: '10px 14px', borderRadius: '4px', fontSize: '0.75rem', color: '#991b1b', lineHeight: 1.4 }}>
                  <strong>Spatial Fit Disclaimer:</strong> Geometric calculations check boundary collisions and specified door/drawer clearance zones. They do not substitute for on-site structural engineering or local municipal building codes.
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
                background: 'rgba(255, 255, 255, 0.01)',
              }}>
                <Upload size={32} className="text-terracotta" />
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Select an ApnaGhar (.apnaghar.json) plan</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
                  Supports native ApnaGhar projects as well as versioned migration from legacy formats.
                </p>
                <input
                  type="file"
                  accept=".json,.apnaghar.json,.fitcheck.json"
                  onChange={handleImportFile}
                  style={{ display: 'block', margin: '8px auto 0 auto', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'demos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Instant preloaded home projects and architectural room templates:
              </p>

              <div
                className="glass-panel"
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--primary-clay)' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={18} className="text-terracotta" />
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>
                      Shanti Niwas (शान्ति निवास) — Full Home
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'var(--primary-clay)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      RECOMMENDED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '440px' }}>
                    Two-story home with 4 curated rooms: Living & Lounge, Dining, Master Bedroom Suite, and Home Studio, complete with doors, windows, and finishes.
                  </div>
                </div>
                <button
                  onClick={() => {
                    const sample = createSampleHomeProject();
                    onLoadProject(sample);
                    onClose();
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                >
                  Load Whole Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
