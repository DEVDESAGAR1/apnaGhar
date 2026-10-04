import React, { useState } from 'react';
import type { RoomModel, RoomMaterialFinish, FloorType, DesignVariant } from '../../types/model';
import { X, Palette, Check, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

interface StylingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
  onUpdateFinishes: (finishes: RoomMaterialFinish) => void;
  onSaveVariant: (variantName: string) => void;
  onApplyVariant: (variant: DesignVariant) => void;
}

export interface CoordinatedTheme {
  id: string;
  name: string;
  subtitle: string;
  wallColor: string;
  wallFinish: 'matte' | 'satin' | 'limewash';
  floorType: FloorType;
  floorColor: string;
  accentColor: string;
  trimColor: string;
  description: string;
}

export const COORDINATED_THEMES: CoordinatedTheme[] = [
  {
    id: 'warm-minimal',
    name: 'Warm Minimal',
    subtitle: 'Alabaster & Natural Oak',
    wallColor: '#F5F2EB',
    wallFinish: 'matte',
    floorType: 'hardwood_oak',
    floorColor: '#C49A6C',
    accentColor: '#C26D53',
    trimColor: '#E6E2D8',
    description: 'Clean architectural warmth featuring sandstone walls, natural wide-plank oak, and terracotta touches.',
  },
  {
    id: 'scandinavian-natural',
    name: 'Scandinavian Natural',
    subtitle: 'Soft Linen & Blonde Oak',
    wallColor: '#F2EDE4',
    wallFinish: 'matte',
    floorType: 'hardwood_oak',
    floorColor: '#D6B995',
    accentColor: '#7D8B7B',
    trimColor: '#FFFFFF',
    description: 'Nordic serenity with airy linen textures, pale blonde timbers, and calming botanical sage tones.',
  },
  {
    id: 'contemporary-indian',
    name: 'Contemporary Indian',
    subtitle: 'Terracotta Clay & Rich Teak',
    wallColor: '#C26D53',
    wallFinish: 'satin',
    floorType: 'hardwood_walnut',
    floorColor: '#6D4C3D',
    accentColor: '#D97706',
    trimColor: '#2C3338',
    description: 'Vibrant modern Indian aesthetics blending artisanal terracotta walls with rich heritage woods and brass.',
  },
  {
    id: 'japandi',
    name: 'Japandi',
    subtitle: 'Limewash Stone & Herringbone',
    wallColor: '#E6E2D8',
    wallFinish: 'limewash',
    floorType: 'herringbone_parquet',
    floorColor: '#B88B58',
    accentColor: '#2C3338',
    trimColor: '#1F2428',
    description: 'Japanese minimalism meets Scandinavian functionalism with textured limewash, chevron oak, and dark contrast.',
  },
  {
    id: 'modern-luxury',
    name: 'Modern Luxury',
    subtitle: 'Charcoal Slate & Terrazzo',
    wallColor: '#2C3338',
    wallFinish: 'satin',
    floorType: 'terrazzo',
    floorColor: '#E2DDD4',
    accentColor: '#C49A6C',
    trimColor: '#111827',
    description: 'Sophisticated moody palette with dramatic slate walls, Italian composite terrazzo, and warm metallic accents.',
  },
  {
    id: 'earthy-organic',
    name: 'Earthy Organic',
    subtitle: 'Muted Sage & Limestone',
    wallColor: '#7D8B7B',
    wallFinish: 'limewash',
    floorType: 'limestone_tile',
    floorColor: '#D8D2C4',
    accentColor: '#C26D53',
    trimColor: '#E6E2D8',
    description: 'Biophilic ground connection with mineral sage plaster, honed natural limestone slabs, and warm clay accents.',
  },
  {
    id: 'industrial-modern',
    name: 'Industrial Modern',
    subtitle: 'Concrete Gray & Polished Concrete',
    wallColor: '#D1D5DB',
    wallFinish: 'matte',
    floorType: 'polished_concrete',
    floorColor: '#A8ACB3',
    accentColor: '#EF4444',
    trimColor: '#1F2937',
    description: 'Urban loft aesthetic with raw poured concrete floors, structural cool neutrals, and black iron details.',
  },
  {
    id: 'calm-coastal',
    name: 'Calm Coastal',
    subtitle: 'Breezy White & Driftwood',
    wallColor: '#F8F9FA',
    wallFinish: 'matte',
    floorType: 'hardwood_oak',
    floorColor: '#C8BEB2',
    accentColor: '#0EA5E9',
    trimColor: '#E2E8F0',
    description: 'Bright seaside atmosphere with sea-salt white walls, weathered driftwood flooring, and coastal azure accents.',
  },
];

const PRESET_WALL_COLORS = [
  { name: 'Warm Alabaster', hex: '#F5F2EB', desc: 'Calm, architectural warm white' },
  { name: 'Limewash Stone', hex: '#E6E2D8', desc: 'Textured natural limestone' },
  { name: 'Muted Sage', hex: '#7D8B7B', desc: 'Organic grounding green' },
  { name: 'Terracotta Clay', hex: '#C26D53', desc: 'Warm artisanal earth tone' },
  { name: 'Soft Linen', hex: '#F2EDE4', desc: 'Gentle neutral woven tone' },
  { name: 'Charcoal Slate', hex: '#2C3338', desc: 'Dramatic accent focal wall' },
];

const PRESET_FLOORS: { type: FloorType; name: string; hex: string; desc: string }[] = [
  { type: 'hardwood_oak', name: 'Natural Oak Hardwood', hex: '#C49A6C', desc: 'Wide plank Scandinavian oak' },
  { type: 'hardwood_walnut', name: 'Rich Walnut', hex: '#6D4C3D', desc: 'Deep warm architectural wood' },
  { type: 'herringbone_parquet', name: 'Herringbone Parquet', hex: '#B88B58', desc: 'Classic chevron artisan pattern' },
  { type: 'polished_concrete', name: 'Polished Concrete', hex: '#A8ACB3', desc: 'Contemporary industrial surface' },
  { type: 'limestone_tile', name: 'Limestone Tile', hex: '#D8D2C4', desc: 'Matte large-format stone pavers' },
  { type: 'terrazzo', name: 'Venetian Terrazzo', hex: '#E2DDD4', desc: 'Speckled quartz and marble composite' },
];

export const StylingModal: React.FC<StylingModalProps> = ({
  isOpen,
  onClose,
  room,
  onUpdateFinishes,
  onSaveVariant,
  onApplyVariant,
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'materials' | 'variants'>('themes');
  const [wallColor, setWallColor] = useState(room.finishes?.wallColor || '#F5F2EB');
  const [wallFinish, setWallFinish] = useState<RoomMaterialFinish['wallFinish']>(room.finishes?.wallFinish || 'matte');
  const [floorType, setFloorType] = useState<FloorType>(room.finishes?.floorType || 'hardwood_oak');
  const [floorColor, setFloorColor] = useState(room.finishes?.floorColor || '#C49A6C');
  const [newVariantName, setNewVariantName] = useState('Option B — Alternative');
  const [appliedThemeId, setAppliedThemeId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTheme = (theme: CoordinatedTheme) => {
    setWallColor(theme.wallColor);
    setWallFinish(theme.wallFinish);
    setFloorType(theme.floorType);
    setFloorColor(theme.floorColor);
    setAppliedThemeId(theme.id);

    onUpdateFinishes({
      wallColor: theme.wallColor,
      wallFinish: theme.wallFinish,
      floorType: theme.floorType,
      floorColor: theme.floorColor,
    });
  };

  const handleApplyCustomFinishes = () => {
    onUpdateFinishes({
      wallColor,
      wallFinish,
      floorType,
      floorColor,
    });
    onClose();
  };

  const handleCreateVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;
    onSaveVariant(newVariantName.trim());
    setNewVariantName('New Design Variant');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(94vw, 760px)', height: 'min(90vh, 800px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={20} className="text-terracotta" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Interior Styling & Material Finishes
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Finishes for &quot;{room.name}&quot; • Synchronized in both 2D and 3D
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <button
            onClick={() => setActiveTab('themes')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'themes' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'themes' ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} />
            <span>8 Coordinated Themes</span>
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'materials' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'materials' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Custom Materials
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className="btn btn-ghost"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'variants' ? 'var(--primary-clay)' : 'transparent',
              color: activeTab === 'variants' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Design Variants ({room.variants?.length || 0})
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* TAB 1: 8 COORDINATED THEMES (Priority 12) */}
          {activeTab === 'themes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Curated architectural themes harmonizing wall finishes, flooring, trim, and accent tones.
                Click any theme to apply it immediately across 2D plan and 3D viewer.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {COORDINATED_THEMES.map(theme => {
                  const isCurrent = (room.finishes?.wallColor === theme.wallColor && room.finishes?.floorColor === theme.floorColor) || appliedThemeId === theme.id;

                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleApplyTheme(theme)}
                      className="glass-panel"
                      style={{
                        padding: '14px',
                        cursor: 'pointer',
                        border: isCurrent ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        background: isCurrent ? 'rgba(194, 109, 83, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {theme.name}
                          </span>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {theme.subtitle}
                          </div>
                        </div>

                        {isCurrent && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                            <CheckCircle2 size={16} />
                            <span>Active</span>
                          </div>
                        )}
                      </div>

                      {/* Swatch Previews */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div title={`Wall: ${theme.wallColor} (${theme.wallFinish})`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: theme.wallColor, border: '1px solid var(--border-medium)', display: 'block' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Wall</span>
                        </div>
                        <div title={`Floor: ${theme.floorColor} (${theme.floorType})`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: theme.floorColor, border: '1px solid var(--border-medium)', display: 'block' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Floor</span>
                        </div>
                        <div title={`Accent: ${theme.accentColor}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: theme.accentColor, border: '1px solid var(--border-medium)', display: 'block' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Accent</span>
                        </div>
                        <div title={`Trim: ${theme.trimColor}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: theme.trimColor, border: '1px solid var(--border-medium)', display: 'block' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Trim</span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {theme.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM MATERIALS */}
          {activeTab === 'materials' && (
            <>
              {/* Wall Color & Finish Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Wall Color & Texture</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['matte', 'satin', 'limewash'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setWallFinish(f)}
                        className="btn btn-ghost"
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          textTransform: 'capitalize',
                          background: wallFinish === f ? 'var(--primary-clay)' : 'transparent',
                          color: wallFinish === f ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {PRESET_WALL_COLORS.map(c => (
                    <div
                      key={c.hex}
                      onClick={() => setWallColor(c.hex)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: wallColor.toLowerCase() === c.hex.toLowerCase() ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: c.hex,
                        border: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {wallColor.toLowerCase() === c.hex.toLowerCase() && <Check size={16} color={c.hex === '#F5F2EB' || c.hex === '#F2EDE4' ? '#000' : '#fff'} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flooring Section */}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
                  Flooring Surface
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
                  {PRESET_FLOORS.map(fl => (
                    <div
                      key={fl.type}
                      onClick={() => {
                        setFloorType(fl.type);
                        setFloorColor(fl.hex);
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: floorType === fl.type ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: fl.hex,
                        flexShrink: 0,
                        border: '1px solid rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {floorType === fl.type && <Check size={16} color="#fff" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{fl.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fl.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleApplyCustomFinishes}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end', padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Apply Custom Materials
              </button>
            </>
          )}

          {/* TAB 3: DESIGN VARIANTS */}
          {activeTab === 'variants' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Snapshot alternate furniture layouts and finishes to compare side-by-side.
              </div>

              {/* Create Variant Form */}
              <form onSubmit={handleCreateVariant} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newVariantName}
                  onChange={e => setNewVariantName(e.target.value)}
                  placeholder="Variant name (e.g. Option B — Minimalist)"
                  className="input-field"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}>
                  <Plus size={14} />
                  <span>Snapshot Current</span>
                </button>
              </form>

              {/* Variants List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(room.variants || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No design variants saved yet. Click &quot;Snapshot Current&quot; above to preserve your first alternative arrangement.
                  </div>
                ) : (
                  (room.variants || []).map(v => (
                    <div
                      key={v.id}
                      className="glass-panel"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {v.furniture.length} furniture items • Created {new Date(v.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onApplyVariant(v);
                          onClose();
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Apply Variant
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
