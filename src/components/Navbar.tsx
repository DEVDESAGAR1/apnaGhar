import React from 'react';
import type { 
  FitProject, 
  UnitType, 
  FitReport, 
  FitStatus 
} from '../types/model';
import { 
  Box, 
  Layers, 
  Sparkles, 
  Plus, 
  Ruler, 
  Share2, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  Camera,
  FolderOpen
} from 'lucide-react';

interface NavbarProps {
  project: FitProject;
  activeView: '2d' | '3d';
  onViewChange: (view: '2d' | '3d') => void;
  onOpenCatalog: () => void;
  onOpenRoomSetup: () => void;
  onOpenPhotoAI: () => void;
  onOpenFitReport: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onOpenProjectList: () => void;
  onUnitChange: (unit: UnitType) => void;
  fitReport: FitReport;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  activeView,
  onViewChange,
  onOpenCatalog,
  onOpenRoomSetup,
  onOpenPhotoAI,
  onOpenFitReport,
  onOpenExport,
  onOpenSettings,
  onOpenProjectList,
  onUnitChange,
  fitReport,
}) => {
  const getStatusBadge = (status: FitStatus) => {
    switch (status) {
      case 'PASS':
        return {
          icon: <CheckCircle2 size={16} className="text-emerald-400" />,
          label: 'FIT PASS',
          className: 'badge-pass',
        };
      case 'FAIL':
        return {
          icon: <XCircle size={16} className="text-rose-400" />,
          label: `${fitReport.summary.failCount} ISSUES`,
          className: 'badge-fail pulse-active',
        };
      case 'REVIEW':
        return {
          icon: <AlertTriangle size={16} className="text-amber-400" />,
          label: `${fitReport.summary.reviewCount} REVIEW`,
          className: 'badge-review',
        };
      case 'NOT_CHECKED':
        return {
          icon: <HelpCircle size={16} className="text-slate-400" />,
          label: 'NOT CHECKED',
          className: 'badge-not-checked',
        };
    }
  };

  const statusBadge = getStatusBadge(fitReport.overallStatus);

  return (
    <header className="navbar-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 18px',
      background: 'rgba(10, 14, 23, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      zIndex: 40,
      gap: '12px',
      height: '62px'
    }}>
      {/* Brand & Project Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 800,
          fontSize: '1.25rem',
          letterSpacing: '-0.03em',
          color: '#ffffff',
          fontFamily: 'var(--font-display)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
          }}>
            <Box size={18} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span>Fit<span style={{ color: 'var(--primary-light)' }}>Check</span></span>
        </div>

        {/* Project Selector / Name */}
        <button 
          onClick={onOpenProjectList}
          className="btn btn-secondary" 
          title="Switch or open projects"
          style={{ 
            fontSize: '0.825rem', 
            padding: '5px 10px',
            maxWidth: '220px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <FolderOpen size={14} className="text-sky-400" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</span>
        </button>
      </div>

      {/* Center: 2D / 3D View Switcher & Unit Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 2D / 3D Pill Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => onViewChange('2d')}
            className="btn"
            style={{
              padding: '5px 14px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              background: activeView === '2d' ? 'var(--primary)' : 'transparent',
              color: activeView === '2d' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              boxShadow: activeView === '2d' ? '0 2px 8px var(--primary-glow)' : 'none',
            }}
          >
            <Layers size={14} />
            <span>2D Plan</span>
          </button>
          <button
            onClick={() => onViewChange('3d')}
            className="btn"
            style={{
              padding: '5px 14px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              background: activeView === '3d' ? 'var(--primary)' : 'transparent',
              color: activeView === '3d' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              boxShadow: activeView === '3d' ? '0 2px 8px var(--primary-glow)' : 'none',
            }}
          >
            <Box size={14} />
            <span>3D View</span>
          </button>
        </div>

        {/* Unit Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          {(['cm', 'm', 'in', 'ft'] as UnitType[]).map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              style={{
                background: project.settings.displayUnit === u ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: project.settings.displayUnit === u ? '#fff' : 'var(--text-dim)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls: Fit Badge, Add Furniture, Room Setup, AI, Export, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Dynamic Fit Report Button */}
        <button
          onClick={onOpenFitReport}
          className={`btn ${statusBadge.className}`}
          style={{
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Open complete FitCheck geometric validation report"
        >
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </button>

        {/* Add Furniture Button */}
        <button
          onClick={onOpenCatalog}
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '0.825rem' }}
        >
          <Plus size={15} />
          <span>Add Furniture</span>
        </button>

        {/* Room Setup Button */}
        <button
          onClick={onOpenRoomSetup}
          className="btn btn-secondary"
          title="Edit Room Dimensions & Openings"
          style={{ padding: '6px 10px', fontSize: '0.825rem' }}
        >
          <Ruler size={15} />
          <span className="hidden-mobile">Room ({project.room.width}×{project.room.length})</span>
        </button>

        {/* Photo AI Assistant Button */}
        <button
          onClick={onOpenPhotoAI}
          className="btn btn-secondary"
          style={{ 
            padding: '6px 10px', 
            fontSize: '0.825rem',
            borderColor: project.photoContext.hasPhoto ? 'rgba(56, 189, 248, 0.4)' : undefined,
          }}
          title="AI Photo Room Analysis & Object Suggestions"
        >
          {project.photoContext.hasPhoto ? <Camera size={15} className="text-sky-400" /> : <Sparkles size={15} className="text-amber-400" />}
          <span className="hidden-mobile">{project.photoContext.hasPhoto ? 'Room Photo' : 'AI Assist'}</span>
        </button>

        {/* Export & Privacy Button */}
        <button
          onClick={onOpenExport}
          className="btn btn-ghost btn-icon"
          title="Export, Share, or Demo Templates (Privacy Protected)"
        >
          <Share2 size={16} />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="btn btn-ghost btn-icon"
          title="App Settings & AI Consent"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
