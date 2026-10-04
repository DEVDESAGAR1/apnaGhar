import React, { useState } from 'react';
import type { AppSettings, UnitType, AiProviderType } from '../../types/model';
import { checkOllamaConnection, type OllamaConnectionStatus } from '../../utils/aiVision';
import { 
  X, 
  Cpu, 
  Trash2, 
  ShieldCheck, 
  Server, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Terminal
} from 'lucide-react';

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
  const [testingOllama, setTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaConnectionStatus | null>(null);
  const [testingGemma, setTestingGemma] = useState(false);
  const [gemmaStatus, setGemmaStatus] = useState<OllamaConnectionStatus | null>(null);

  if (!isOpen) return null;

  const currentProvider: AiProviderType = 
    settings.aiProvider === 'custom-gemini-key' ? 'cloud-gemini' : (settings.aiProvider || 'local-heuristic');

  const handleTestOllama = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    try {
      const status = await checkOllamaConnection(
        settings.ollamaBaseUrl || 'http://localhost:11434',
        settings.ollamaModel || 'llama3.2-vision'
      );
      setOllamaStatus(status);
    } finally {
      setTestingOllama(false);
    }
  };

  const handleTestGemma = async () => {
    setTestingGemma(true);
    setGemmaStatus(null);
    try {
      const status = await checkOllamaConnection(
        settings.ollamaBaseUrl || 'http://localhost:11434',
        settings.gemmaModel || 'paligemma:3b'
      );
      setGemmaStatus(status);
    } finally {
      setTestingGemma(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 640px)', maxHeight: 'min(92vh, 840px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Application & AI Preferences
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              ApnaGhar (अपना घर) — Privacy, Units, Snapping & Vision Providers
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '22px', overflowY: 'auto' }}>
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
                    background: settings.displayUnit === unit ? 'var(--primary-clay)' : 'rgba(255, 255, 255, 0.05)',
                    color: settings.displayUnit === unit ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: settings.displayUnit === unit ? 700 : 500,
                  }}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '5px', display: 'block' }}>
              Canonical calculations always evaluate in physical centimeters (cm) with zero floating scale drift.
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
                      background: settings.gridSnapSizeCm === size ? 'var(--primary-clay)' : 'transparent',
                      color: settings.gridSnapSizeCm === size ? '#fff' : 'var(--text-muted)',
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Highlight front drawer pullout, door swings & seating buffers</span>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Display dimension text labels on 2D floor plans</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showDimensionsOnPlan}
                onChange={e => onUpdateSettings({ ...settings, showDimensionsOnPlan: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
          </div>

          {/* AI Vision Provider Architecture */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-medium)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} className="text-terracotta" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Vision & Layout Assistant Provider</span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
              Choose how ApnaGhar analyzes uploaded room photographs. Core spatial planning and deterministic clearance checks run independent of any AI.
            </p>

            {/* Provider Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Local Heuristic */}
              <div
                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'local-heuristic' })}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: currentProvider === 'local-heuristic' ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                  background: currentProvider === 'local-heuristic' ? 'rgba(194, 109, 83, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Built-in Heuristic Engine</span>
                    <span style={{ fontSize: '0.65rem', background: '#064e3b', color: '#6ee7b7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      RECOMMENDED • 100% PRIVATE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Evaluates room proportions and perspective lines 100% on-device inside your browser. No downloads or setup required.
                  </p>
                </div>
                <input
                  type="radio"
                  name="aiProvider"
                  checked={currentProvider === 'local-heuristic'}
                  onChange={() => onUpdateSettings({ ...settings, aiProvider: 'local-heuristic' })}
                  style={{ marginTop: '3px' }}
                />
              </div>

              {/* Option 2: Google Gemma Vision (PaliGemma) */}
              <div
                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'local-gemma' })}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: currentProvider === 'local-gemma' ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                  background: currentProvider === 'local-gemma' ? 'rgba(194, 109, 83, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={16} className="text-terracotta" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Google Gemma Vision (PaliGemma)</span>
                    <span style={{ fontSize: '0.65rem', background: '#7c2d12', color: '#fed7aa', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      GEMMA VISION • ON-DEVICE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Executes Google&apos;s open PaliGemma / PaliGemma 2 multimodal vision model locally via Ollama. 100% private, on-device spatial intelligence.
                  </p>
                </div>
                <input
                  type="radio"
                  name="aiProvider"
                  checked={currentProvider === 'local-gemma'}
                  onChange={() => onUpdateSettings({ ...settings, aiProvider: 'local-gemma' })}
                  style={{ marginTop: '3px' }}
                />
              </div>

              {/* Option 3: Local Ollama Vision */}
              <div
                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'local-ollama' })}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: currentProvider === 'local-ollama' ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                  background: currentProvider === 'local-ollama' ? 'rgba(194, 109, 83, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={16} className="text-amber-400" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Local Ollama Vision (LLaVA / Llama 3.2)</span>
                    <span style={{ fontSize: '0.65rem', background: '#78350f', color: '#fde68a', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      LOCAL NEURAL NETWORK
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Connects to your local Ollama runtime to execute open-source vision models (LLaVA / Llama 3.2 Vision). Zero cloud transmission.
                  </p>
                </div>
                <input
                  type="radio"
                  name="aiProvider"
                  checked={currentProvider === 'local-ollama'}
                  onChange={() => onUpdateSettings({ ...settings, aiProvider: 'local-ollama' })}
                  style={{ marginTop: '3px' }}
                />
              </div>

              {/* Option 4: Cloud Gemini */}
              <div
                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'cloud-gemini' })}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: currentProvider === 'cloud-gemini' ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                  background: currentProvider === 'cloud-gemini' ? 'rgba(194, 109, 83, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} className="text-sky-400" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Google Gemini 1.5 Flash Vision</span>
                    <span style={{ fontSize: '0.65rem', background: '#1e3a8a', color: '#93c5fd', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      CLOUD • REQUIRES KEY & CONSENT
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    External Google AI Studio cloud model. Transmits images over the internet. Requires personal API key and explicit user opt-in.
                  </p>
                </div>
                <input
                  type="radio"
                  name="aiProvider"
                  checked={currentProvider === 'cloud-gemini'}
                  onChange={() => onUpdateSettings({ ...settings, aiProvider: 'cloud-gemini' })}
                  style={{ marginTop: '3px' }}
                />
              </div>
            </div>

            {/* Sub-Panel: Gemma Vision Configuration */}
            {currentProvider === 'local-gemma' && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Google Gemma (PaliGemma) Configuration
                  </span>
                  <button
                    type="button"
                    onClick={handleTestGemma}
                    disabled={testingGemma}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    <RefreshCw size={12} className={testingGemma ? 'animate-spin' : ''} />
                    <span>{testingGemma ? 'Testing...' : 'Test Gemma Connection'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Ollama Base URL
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaBaseUrl || 'http://localhost:11434'}
                      onChange={e => onUpdateSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="input-field font-mono"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Gemma Vision Model Tag
                    </label>
                    <input
                      type="text"
                      value={settings.gemmaModel || 'paligemma:3b'}
                      onChange={e => onUpdateSettings({ ...settings, gemmaModel: e.target.value })}
                      placeholder="paligemma:3b or paligemma"
                      className="input-field font-mono"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Connection Test Result */}
                {gemmaStatus && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: gemmaStatus.connected ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                    border: `1px solid ${gemmaStatus.connected ? '#059669' : '#dc2626'}`,
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                  }}>
                    {gemmaStatus.connected ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}>
                          <CheckCircle2 size={14} />
                          <span>Ollama Connected Successfully!</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          Target Gemma model &apos;{settings.gemmaModel || 'paligemma:3b'}&apos;: {gemmaStatus.modelInstalled ? '✓ Installed and ready for local vision' : '⚠ Model tag not found in Ollama'}
                        </div>
                        {gemmaStatus.models.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            Available models: {gemmaStatus.models.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 600 }}>
                          <XCircle size={14} />
                          <span>Connection Failed</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          {gemmaStatus.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Troubleshooting instructions */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  lineHeight: 1.45,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <Terminal size={12} />
                    <span>Quick Google PaliGemma Setup:</span>
                  </div>
                  <div>1. Pull model: <code style={{ color: '#fde68a' }}>ollama run paligemma:3b</code> or <code style={{ color: '#fde68a' }}>ollama run paligemma</code></div>
                  <div>2. Allow browser CORS: start with <code style={{ color: '#fde68a' }}>set OLLAMA_ORIGINS=* && ollama serve</code></div>
                  <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>License: Gemma Terms of Use / PaliGemma Additional Terms of Use (Google Open Model)</div>
                </div>
              </div>
            )}

            {/* Sub-Panel: Ollama Configuration */}
            {currentProvider === 'local-ollama' && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Ollama Instance Configuration
                  </span>
                  <button
                    type="button"
                    onClick={handleTestOllama}
                    disabled={testingOllama}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    <RefreshCw size={12} className={testingOllama ? 'animate-spin' : ''} />
                    <span>{testingOllama ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Ollama Base URL
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaBaseUrl || 'http://localhost:11434'}
                      onChange={e => onUpdateSettings({ ...settings, ollamaBaseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="input-field font-mono"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Vision Model Name
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaModel || 'llama3.2-vision'}
                      onChange={e => onUpdateSettings({ ...settings, ollamaModel: e.target.value })}
                      placeholder="llama3.2-vision or llava:7b"
                      className="input-field font-mono"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Connection Test Result */}
                {ollamaStatus && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: ollamaStatus.connected ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                    border: `1px solid ${ollamaStatus.connected ? '#059669' : '#dc2626'}`,
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                  }}>
                    {ollamaStatus.connected ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}>
                          <CheckCircle2 size={14} />
                          <span>Ollama Connected Successfully!</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          Target model '{settings.ollamaModel || 'llama3.2-vision'}': {ollamaStatus.modelInstalled ? '✓ Installed and ready' : '⚠ Not found in Ollama tags'}
                        </div>
                        {ollamaStatus.models.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            Available models: {ollamaStatus.models.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 600 }}>
                          <XCircle size={14} />
                          <span>Connection Failed</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          {ollamaStatus.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Troubleshooting instructions */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  lineHeight: 1.45,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <Terminal size={12} />
                    <span>Quick Ollama Terminal Setup:</span>
                  </div>
                  <div>1. Pull model: <code style={{ color: '#fde68a' }}>ollama run llama3.2-vision</code> or <code style={{ color: '#fde68a' }}>ollama run llava:7b</code></div>
                  <div>2. Allow browser CORS: start with <code style={{ color: '#fde68a' }}>OLLAMA_ORIGINS="*" ollama serve</code></div>
                </div>
              </div>
            )}

            {/* Sub-Panel: Gemini Cloud Configuration */}
            {currentProvider === 'cloud-gemini' && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableExternalAi}
                    onChange={e => onUpdateSettings({ ...settings, enableExternalAi: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      I explicitly consent to transmitting room images to Google Cloud
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                      Images leave your machine and are processed by Google AI Studio
                    </span>
                  </div>
                </label>

                <div>
                  <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Google AI Studio API Key (stored in local browser storage only)
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={settings.customAiApiKey || ''}
                    onChange={e => onUpdateSettings({ ...settings, customAiApiKey: e.target.value })}
                    className="input-field font-mono"
                    style={{ fontSize: '0.75rem', padding: '6px 10px', width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Purge Local Data Section */}
          <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all data and clear stored photos? This action is permanent.')) {
                  onPurgeAllData();
                  onClose();
                }
              }}
              className="btn btn-danger"
              style={{ width: '100%', fontSize: '0.8rem', padding: '10px' }}
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
