import React from 'react';
import type { AppSettings, UnitType } from '../../types/model';
import { X, Cpu, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updated: AppSettings) => void;
  onPurgeAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onPurgeAllData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 560px)' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Application Settings
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {/* Display Units */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
              Measurement Display Unit
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(['cm', 'm', 'in', 'ft'] as UnitType[]).map(unit => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, displayUnit: unit })}
                  className="btn"
                  style={{
                    background: settings.displayUnit === unit ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: settings.displayUnit === unit ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Internal geometric engine always operates on canonical centimeters (cm).
            </span>
          </div>

          {/* Grid Snap & Canvas Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Grid Snapping</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Snap furniture positions to intervals while dragging</span>
              </div>
              <input
                type="checkbox"
                checked={settings.gridSnap}
                onChange={e => onUpdateSettings({ ...settings, gridSnap: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>

            {settings.gridSnap && (
              <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Snap Grid Size:</span>
                {[5, 10, 25].map(size => (
                  <button
                    key={size}
                    onClick={() => onUpdateSettings({ ...settings, gridSnapSizeCm: size })}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      background: settings.gridSnapSizeCm === size ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      color: settings.gridSnapSizeCm === size ? '#38bdf8' : 'var(--text-muted)',
                    }}
                  >
                    {size} cm
                  </button>
                ))}
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Functional Clearance Zones</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Highlight front drawer pullout & seating clearance</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showClearanceZones}
                onChange={e => onUpdateSettings({ ...settings, showClearanceZones: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Wall Dimension Annotations</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Display dimension text labels on 2D walls</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showDimensionsOnPlan}
                onChange={e => onUpdateSettings({ ...settings, showDimensionsOnPlan: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
          </div>

          {/* Privacy & AI Provider Section */}
          <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem' }}>
              <Cpu size={18} />
              <span>AI Provider & Privacy Settings</span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
              FitCheck is privacy-first. By default, room photos and layout suggestions use our on-device heuristic engine (100% offline).
            </p>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: '6px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Allow External Vision AI</span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'block' }}>Requires explicit opt-in and your personal API key</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableExternalAi}
                onChange={e => onUpdateSettings({ ...settings, enableExternalAi: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>

            {settings.enableExternalAi && (
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Google Gemini API Key (stored in local browser storage only)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={settings.customAiApiKey || ''}
                  onChange={e => onUpdateSettings({ ...settings, customAiApiKey: e.target.value })}
                  className="input-field font-mono"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            )}
          </div>

          {/* Clear Storage */}
          <div style={{ paddingTop: '8px' }}>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all data and clear stored photos?')) {
                  onPurgeAllData();
                  onClose();
                }
              }}
              className="btn btn-danger"
              style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
            >
              <Trash2 size={15} />
              <span>Purge Local Storage & Cached Photos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
