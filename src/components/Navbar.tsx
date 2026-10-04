import React, { useState } from 'react';
import type { 
  HomeProject, 
  UnitType, 
  FitReport, 
  FitStatus,
  RoomModel 
} from '../types/model';
import { 
  Home, 
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
  FolderOpen,
  Palette,
  ChevronDown,
  Box
} from 'lucide-react';

interface NavbarProps {
  project: HomeProject;
  activeRoom: RoomModel;
  activeView: '2d' | '3d';
  onViewChange: (view: '2d' | '3d') => void;
  onSelectRoom: (roomId: string) => void;
  onOpenHomeOverview: () => void;
  onOpenCatalog: () => void;
  onOpenRoomSetup: () => void;
  onOpenPhotoAI: () => void;
  onOpenFitReport: () => void;
  onOpenStyling: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onOpenProjectList: () => void;
  onUnitChange: (unit: UnitType) => void;
  fitReport: FitReport;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  activeRoom,
  activeView,
  onViewChange,
  onSelectRoom,
  onOpenHomeOverview,
  onOpenCatalog,
  onOpenRoomSetup,
  onOpenPhotoAI,
  onOpenFitReport,
  onOpenStyling,
  onOpenExport,
  onOpenSettings,
  onOpenProjectList,
  onUnitChange,
  fitReport,
}) => {
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const getStatusBadge = (status: FitStatus) => {
    switch (status) {
      case 'PASS':
        return {
          icon: <CheckCircle2 size={15} className="text-emerald-400" />,
          label: 'FIT PASS',
          className: 'badge-pass',
        };
      case 'FAIL':
        return {
          icon: <XCircle size={15} className="text-rose-400" />,
          label: `${fitReport.summary.failCount} ISSUES`,
          className: 'badge-fail pulse-active',
        };
      case 'REVIEW':
        return {
          icon: <AlertTriangle size={15} className="text-amber-400" />,
          label: `${fitReport.summary.reviewCount} REVIEW`,
          className: 'badge-review',
        };
      case 'NOT_CHECKED':
        return {
          icon: <HelpCircle size={15} className="text-slate-400" />,
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
      padding: '8px 18px',
      background: 'rgba(10, 13, 20, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      zIndex: 40,
      gap: '12px',
      height: '62px',
    }}>
      {/* Brand & Home Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          onClick={onOpenProjectList}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Click to manage or switch homes"
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--terracotta) 0%, #a85a42 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px var(--terracotta-glow)',
          }}>
            <Home size={18} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.1,
            }}>
              ApnaGhar <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-accent)' }}>अपना घर</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
              {project.name}
            </div>
          </div>
        </div>

        {/* Room Switcher Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoomDropdown(v => !v)}
            className="btn btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Switch active room or open whole-home view"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeRoom.finishes?.wallColor || '#F5F2EB',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }} />
            <span>{activeRoom.name}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showRoomDropdown && (
            <div 
              className="glass-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '240px',
                zIndex: 60,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Rooms ({project.rooms.length})
              </div>
              {project.rooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelectRoom(r.id);
                    setShowRoomDropdown(false);
                  }}
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    fontSize: '0.8rem',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: r.id === activeRoom.id ? 'rgba(194, 109, 83, 0.15)' : 'transparent',
                    color: r.id === activeRoom.id ? 'var(--primary-light)' : 'var(--text-main)',
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: r.finishes?.wallColor || '#F5F2EB',
                    marginRight: '6px',
                  }} />
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {r.furniture?.length || 0} pcs
                  </span>
                </button>
              ))}

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  onOpenHomeOverview();
                  setShowRoomDropdown(false);
                }}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.75rem', padding: '6px', justifyContent: 'center' }}
              >
                <span>Whole-Home Overview</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: 2D / 3D Switcher & Unit Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              padding: '4px 12px',
              fontSize: '0.775rem',
              borderRadius: '6px',
              background: activeView === '2d' ? 'var(--primary)' : 'transparent',
              color: activeView === '2d' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              boxShadow: activeView === '2d' ? '0 2px 8px var(--primary-glow)' : 'none',
            }}
          >
            <Layers size={13} />
            <span>2D Plan</span>
          </button>
          <button
            onClick={() => onViewChange('3d')}
            className="btn"
            style={{
              padding: '4px 12px',
              fontSize: '0.775rem',
              borderRadius: '6px',
              background: activeView === '3d' ? 'var(--primary)' : 'transparent',
              color: activeView === '3d' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              boxShadow: activeView === '3d' ? '0 2px 8px var(--primary-glow)' : 'none',
            }}
          >
            <Box size={13} />
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
                padding: '3px 7px',
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

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Dynamic Fit Report Badge */}
        <button
          onClick={onOpenFitReport}
          className={`btn ${statusBadge.className}`}
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Open complete spatial fit validation report"
        >
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </button>

        {/* Add Furniture Button */}
        <button
          onClick={onOpenCatalog}
          className="btn btn-primary"
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
          title="Add Furniture from Catalog"
        >
          <Plus size={14} />
          <span className="nav-btn-label">Add Furniture</span>
        </button>

        {/* Interior Styling Button */}
        <button
          onClick={onOpenStyling}
          className="btn btn-secondary"
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
          title="Wall colors, flooring finishes, and design variants"
        >
          <Palette size={14} className="text-terracotta" />
          <span className="nav-btn-label">Styling</span>
        </button>

        {/* Room Dimensions Setup Button */}
        <button
          onClick={onOpenRoomSetup}
          className="btn btn-secondary"
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
          title="Edit Room Dimensions, Doors & Windows"
        >
          <Ruler size={14} />
          <span className="nav-btn-label">Room</span>
        </button>

        {/* Photo AI Assistant */}
        <button
          onClick={onOpenPhotoAI}
          className="btn btn-secondary"
          style={{ 
            padding: '5px 10px', 
            fontSize: '0.8rem',
            borderColor: project.photoContext.hasPhoto ? 'rgba(56, 189, 248, 0.4)' : undefined,
          }}
          title="Privacy-First Photo AI Room Assistant"
        >
          {project.photoContext.hasPhoto ? <Camera size={14} className="text-sky-400" /> : <Sparkles size={14} className="text-amber-400" />}
          <span className="nav-btn-label">{project.photoContext.hasPhoto ? 'Photo' : 'AI'}</span>
        </button>

        {/* Whole-Home Overview Button */}
        <button
          onClick={onOpenHomeOverview}
          className="btn btn-ghost btn-icon"
          title="Whole-Home Overview Dashboard"
        >
          <Home size={16} />
        </button>

        {/* Saved Projects Directory Button */}
        <button
          onClick={onOpenProjectList}
          className="btn btn-ghost btn-icon"
          title="Projects Directory"
        >
          <FolderOpen size={16} />
        </button>

        {/* Export & Privacy Button */}
        <button
          onClick={onOpenExport}
          className="btn btn-ghost btn-icon"
          title="Export, Share, or Demo Templates"
        >
          <Share2 size={16} />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="btn btn-ghost btn-icon"
          title="Settings & Privacy Preferences"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
