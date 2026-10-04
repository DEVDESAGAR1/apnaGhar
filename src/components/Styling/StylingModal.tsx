import React, { useState, useMemo } from 'react';
import type { 
  RoomModel, 
  RoomMaterialFinish, 
  FloorType, 
  WallFinishType, 
  DesignVariant, 
  HomeProject, 
  WholeHomeStyleConfig 
} from '../../types/model';
import { 
  CURATED_PALETTES, 
  INTERIOR_STYLES, 
  PAINT_COLORS, 
  FLOOR_MATERIALS, 
  type ColorFamily, 
  type CuratedPalette, 
  type InteriorStyle,
  type MaterialOption,
  filterPaintColors 
} from '../../utils/designSystem';
import { 
  X, 
  Palette, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  Layers, 
  Home, 
  RotateCcw,
  Sliders,
  Paintbrush
} from 'lucide-react';

interface StylingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
  project?: HomeProject;
  onUpdateFinishes: (finishes: RoomMaterialFinish) => void;
  onSaveVariant: (variantName: string) => void;
  onApplyVariant: (variant: DesignVariant) => void;
  onApplyWholeHomeStyling?: (
    stylingConfig: WholeHomeStyleConfig, 
    targetRoomIds?: string[], 
    preserveCustomizedRooms?: boolean
  ) => void;
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

// Retained for test compatibility with spatialAndThemes.test.ts
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

const COLOR_FAMILIES: { id: ColorFamily | 'all'; label: string }[] = [
  { id: 'all', label: 'All Colors' },
  { id: 'whites', label: 'Whites' },
  { id: 'neutrals', label: 'Neutrals' },
  { id: 'earth_tones', label: 'Earth Tones' },
  { id: 'greens', label: 'Greens' },
  { id: 'blues', label: 'Blues' },
  { id: 'pinks', label: 'Pinks' },
  { id: 'purples', label: 'Purples' },
  { id: 'yellows', label: 'Yellows' },
  { id: 'dark_accents', label: 'Dark Accents' },
  { id: 'natural_shades', label: 'Natural' },
];

export const StylingModal: React.FC<StylingModalProps> = ({
  isOpen,
  onClose,
  room,
  project,
  onUpdateFinishes,
  onSaveVariant,
  onApplyVariant,
  onApplyWholeHomeStyling,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'palettes' | 'styles' | 'colors' | 'materials' | 'variants'>('palettes');

  // Surface finishes state
  const [wallColor, setWallColor] = useState(room.finishes?.wallColor || '#F5F2EB');
  const [accentWallColor, setAccentWallColor] = useState(room.finishes?.accentWallColor || '');
  const [ceilingColor, setCeilingColor] = useState(room.finishes?.ceilingColor || '#FAF8F5');
  const [trimColor, setTrimColor] = useState(room.finishes?.trimColor || '#FAF8F5');
  const [furnitureAccentColor, setFurnitureAccentColor] = useState(room.finishes?.furnitureAccentColor || '#C49A6C');
  const [wallFinish, setWallFinish] = useState<WallFinishType>(room.finishes?.wallFinish || 'matte');
  const [floorType, setFloorType] = useState<FloorType>(room.finishes?.floorType || 'hardwood_oak');
  const [floorColor, setFloorColor] = useState(room.finishes?.floorColor || '#C49A6C');
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(room.finishes?.paletteId || null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(room.finishes?.styleId || null);

  // Paint library filtering state
  const [selectedFamily, setSelectedFamily] = useState<ColorFamily | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [colorTarget, setColorTarget] = useState<'wallColor' | 'accentWallColor' | 'ceilingColor' | 'trimColor' | 'furnitureAccentColor'>('wallColor');

  // Application scope state (Whole House vs Single Room)
  const [applyScope, setApplyScope] = useState<'this_room' | 'whole_home' | 'selected_rooms'>('this_room');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([room.id]);
  const [preserveCustom, setPreserveCustom] = useState(false);
  const [newVariantName, setNewVariantName] = useState('Option B — Alternative');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered paint colors
  const filteredColors = useMemo(() => {
    return filterPaintColors({
      family: selectedFamily === 'all' ? undefined : selectedFamily,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [selectedFamily, searchQuery]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Applying a curated palette
  const handleApplyPalette = (palette: CuratedPalette) => {
    setSelectedPaletteId(palette.id);
    setWallColor(palette.primaryWallColor);
    setAccentWallColor(palette.accentWallColor);
    setCeilingColor(palette.ceilingColor);
    setTrimColor(palette.trimColor);
    setFurnitureAccentColor(palette.furnitureAccentColor);
    setFloorType(palette.pairedFloorType);
    setFloorColor(palette.pairedFloorColor);
    setWallFinish(palette.wallFinish);

    showToast(`Loaded palette: ${palette.name}`);
  };

  // 2. Applying an interior design style
  const handleApplyStyle = (style: InteriorStyle) => {
    setSelectedStyleId(style.id);
    const matchedPalette = CURATED_PALETTES.find(p => p.id === style.defaultPaletteId) || CURATED_PALETTES[0];
    handleApplyPalette(matchedPalette);
    showToast(`Loaded style: ${style.name}`);
  };

  // 3. Picking a paint color from the 60+ color library
  const handlePickColor = (hex: string) => {
    if (colorTarget === 'wallColor') setWallColor(hex);
    else if (colorTarget === 'accentWallColor') setAccentWallColor(hex);
    else if (colorTarget === 'ceilingColor') setCeilingColor(hex);
    else if (colorTarget === 'trimColor') setTrimColor(hex);
    else if (colorTarget === 'furnitureAccentColor') setFurnitureAccentColor(hex);
  };

  // 4. Choosing a flooring material
  const handleSelectFloor = (mat: MaterialOption) => {
    setFloorType(mat.type);
    setFloorColor(mat.defaultHex);
  };

  // 5. Commit changes according to scope
  const handleCommitChanges = () => {
    const finishes: RoomMaterialFinish = {
      wallColor,
      wallFinish,
      floorType,
      floorColor,
      accentWallColor: accentWallColor || undefined,
      ceilingColor,
      trimColor,
      furnitureAccentColor,
      paletteId: selectedPaletteId || undefined,
      styleId: selectedStyleId || undefined,
    };

    if (applyScope === 'this_room' || !onApplyWholeHomeStyling) {
      onUpdateFinishes(finishes);
      showToast(`Updated finishes for ${room.name}`);
    } else {
      const wholeHomeConfig: WholeHomeStyleConfig = {
        preferredStyle: selectedStyleId || undefined,
        sharedPaletteId: selectedPaletteId || undefined,
        primaryWallColor: wallColor,
        accentWallColor: accentWallColor || undefined,
        ceilingColor,
        trimColor,
        sharedFloorType: floorType,
        sharedFloorColor: floorColor,
        sharedWallFinish: wallFinish,
      };

      const targetIds = applyScope === 'whole_home' 
        ? undefined 
        : selectedRoomIds;

      onApplyWholeHomeStyling(wholeHomeConfig, targetIds, preserveCustom);
      const count = applyScope === 'whole_home' ? (project?.rooms?.length || 1) : selectedRoomIds.length;
      showToast(`Applied design changes across ${count} rooms!`);
    }

    onClose();
  };

  // 6. Reset to room's original finishes
  const handleResetToOriginal = () => {
    setWallColor(room.finishes?.wallColor || '#F5F2EB');
    setAccentWallColor(room.finishes?.accentWallColor || '');
    setCeilingColor(room.finishes?.ceilingColor || '#FAF8F5');
    setTrimColor(room.finishes?.trimColor || '#FAF8F5');
    setFurnitureAccentColor(room.finishes?.furnitureAccentColor || '#C49A6C');
    setFloorType(room.finishes?.floorType || 'hardwood_oak');
    setFloorColor(room.finishes?.floorColor || '#C49A6C');
    setWallFinish(room.finishes?.wallFinish || 'matte');
    setSelectedPaletteId(room.finishes?.paletteId || null);
    setSelectedStyleId(room.finishes?.styleId || null);
    showToast('Reset finishes to original values');
  };

  const handleCreateVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantName.trim()) return;
    onSaveVariant(newVariantName.trim());
    setNewVariantName('New Design Variant');
    showToast(`Saved variant: "${newVariantName.trim()}"`);
  };

  const toggleRoomSelection = (rId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(rId) ? prev.filter(id => id !== rId) : [...prev, rId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(96vw, 980px)', height: 'min(92vh, 880px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Palette size={22} className="text-terracotta" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                Interior Styling, Colors & Material Finishes
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                ApnaGhar (अपना घर) — 16 Curated Palettes • 24 Interior Styles • 60+ Paint Shades • 14 Flooring Materials
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs & Active Surface Live Preview */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'palettes', label: 'Curated Palettes (16)', icon: Sparkles },
              { id: 'styles', label: 'Interior Styles (24)', icon: Home },
              { id: 'colors', label: 'Paint Colors (60+)', icon: Paintbrush },
              { id: 'materials', label: 'Floors & Finishes (14)', icon: Layers },
              { id: 'variants', label: 'Saved Variants', icon: Sliders },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.775rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mini Surface Summary Swatches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600 }}>Active Surfaces:</span>
            <div title={`Primary Wall: ${wallColor}`} style={{ width: '18px', height: '18px', borderRadius: '50%', background: wallColor, border: '1px solid #fff' }} />
            {accentWallColor && (
              <div title={`Accent Wall: ${accentWallColor}`} style={{ width: '18px', height: '18px', borderRadius: '50%', background: accentWallColor, border: '1px solid #fff' }} />
            )}
            <div title={`Floor (${floorType}): ${floorColor}`} style={{ width: '18px', height: '18px', borderRadius: '4px', background: floorColor, border: '1px solid #fff' }} />
            <div title={`Trim: ${trimColor}`} style={{ width: '18px', height: '18px', borderRadius: '50%', background: trimColor, border: '1px solid #fff' }} />
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          
          {/* TAB 1: CURATED PALETTES */}
          {activeTab === 'palettes' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                  Curated Architectural Color Palettes
                </h3>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                  Each palette specifies primary walls, accent focal walls, ceilings, trim mouldings, and matching flooring.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {CURATED_PALETTES.map(pal => {
                  const isSelected = selectedPaletteId === pal.id;
                  return (
                    <div
                      key={pal.id}
                      onClick={() => handleApplyPalette(pal)}
                      className="glass-panel"
                      style={{
                        padding: '14px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(194, 109, 83, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>
                              {pal.name}
                            </span>
                            <span style={{ fontSize: '0.725rem', color: 'var(--primary-clay)', fontWeight: 600 }}>
                              {pal.subtitle}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-terracotta" />}
                        </div>

                        <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: '8px 0', lineHeight: 1.4 }}>
                          {pal.description}
                        </p>
                      </div>

                      {/* Swatches preview */}
                      <div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                          <div title={`Primary Wall: ${pal.primaryWallColor}`} style={{ flex: 2, height: '24px', borderRadius: '4px', background: pal.primaryWallColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <div title={`Accent Wall: ${pal.accentWallColor}`} style={{ flex: 1.5, height: '24px', borderRadius: '4px', background: pal.accentWallColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <div title={`Floor: ${pal.pairedFloorColor}`} style={{ flex: 1.5, height: '24px', borderRadius: '4px', background: pal.pairedFloorColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <div title={`Trim: ${pal.trimColor}`} style={{ flex: 1, height: '24px', borderRadius: '4px', background: pal.trimColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Floor: {pal.pairedFloorType.replace(/_/g, ' ')}</span>
                          <span style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>Finish: {pal.wallFinish}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INTERIOR DESIGN STYLES */}
          {activeTab === 'styles' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                  24 Architectural & Interior Design Styles
                </h3>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                  Select an authentic design style to align room materials, color defaults, and furniture guidance.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {INTERIOR_STYLES.map(style => {
                  const isSelected = selectedStyleId === style.id;
                  return (
                    <div
                      key={style.id}
                      onClick={() => handleApplyStyle(style)}
                      className="glass-panel"
                      style={{
                        padding: '14px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(194, 109, 83, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>
                              {style.name}
                            </span>
                            <span style={{ fontSize: '0.725rem', color: 'var(--primary-clay)', fontWeight: 600 }}>
                              {style.subtitle}
                            </span>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-terracotta" />}
                        </div>

                        <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: '8px 0', lineHeight: 1.4 }}>
                          {style.description}
                        </p>

                        {/* Preferred color dots */}
                        <div style={{ display: 'flex', gap: '5px', margin: '8px 0' }}>
                          {style.colorPreferences.map((c, idx) => (
                            <div key={idx} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.3)' }} />
                          ))}
                        </div>

                        {/* Material guidance tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '6px 0' }}>
                          {style.materialPreferences.slice(0, 3).map((mat, idx) => (
                            <span key={idx} style={{ fontSize: '0.65rem', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-dim)' }}>
                              {mat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                        💡 {style.furnitureGuidance}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PAINT COLOR LIBRARY */}
          {activeTab === 'colors' && (
            <div>
              {/* Target Surface Selector */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paintbrush size={16} className="text-terracotta" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Select Color For Surface:</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'wallColor', label: 'Primary Wall', current: wallColor },
                    { id: 'accentWallColor', label: 'Accent Wall (North)', current: accentWallColor || '#None' },
                    { id: 'ceilingColor', label: 'Ceiling', current: ceilingColor },
                    { id: 'trimColor', label: 'Trim Moulding', current: trimColor },
                    { id: 'furnitureAccentColor', label: 'Furniture Accent', current: furnitureAccentColor },
                  ].map(surf => (
                    <button
                      key={surf.id}
                      onClick={() => setColorTarget(surf.id as any)}
                      className="btn"
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        background: colorTarget === surf.id ? 'var(--primary-clay)' : 'rgba(255, 255, 255, 0.05)',
                        color: colorTarget === surf.id ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: surf.current.startsWith('#') ? surf.current : '#666', border: '1px solid #fff' }} />
                      <span>{surf.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Family Filter Pills */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search 60+ paint shades by name or keyword..."
                    className="input-field"
                    style={{ paddingLeft: '32px', fontSize: '0.8rem', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {COLOR_FAMILIES.map(fam => (
                    <button
                      key={fam.id}
                      onClick={() => setSelectedFamily(fam.id)}
                      className="btn btn-ghost"
                      style={{
                        fontSize: '0.725rem',
                        padding: '4px 8px',
                        background: selectedFamily === fam.id ? 'rgba(194, 109, 83, 0.2)' : 'transparent',
                        color: selectedFamily === fam.id ? 'var(--primary-clay)' : 'var(--text-muted)',
                        fontWeight: selectedFamily === fam.id ? 700 : 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fam.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Swatch Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {filteredColors.map(color => {
                  const isCurrentTarget = 
                    (colorTarget === 'wallColor' && wallColor === color.hex) ||
                    (colorTarget === 'accentWallColor' && accentWallColor === color.hex) ||
                    (colorTarget === 'ceilingColor' && ceilingColor === color.hex) ||
                    (colorTarget === 'trimColor' && trimColor === color.hex) ||
                    (colorTarget === 'furnitureAccentColor' && furnitureAccentColor === color.hex);

                  return (
                    <div
                      key={color.id}
                      onClick={() => handlePickColor(color.hex)}
                      className="glass-panel"
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        border: isCurrentTarget ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      <div 
                        style={{ 
                          height: '52px', 
                          borderRadius: '4px', 
                          background: color.hex, 
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
                        }}
                      >
                        {isCurrentTarget && <Check size={18} color="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.725rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {color.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span>{color.hex}</span>
                        <span style={{ textTransform: 'capitalize' }}>{color.tone}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Hex Input */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custom Hex Color:</span>
                <input
                  type="color"
                  value={wallColor}
                  onChange={e => handlePickColor(e.target.value)}
                  style={{ width: '32px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={colorTarget === 'wallColor' ? wallColor : (colorTarget === 'accentWallColor' ? accentWallColor : trimColor)}
                  onChange={e => handlePickColor(e.target.value)}
                  placeholder="#FAF8F5"
                  className="input-field font-mono"
                  style={{ fontSize: '0.75rem', padding: '4px 8px', width: '100px' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  Applies directly to currently selected surface target ({colorTarget})
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: FLOORS & WALL FINISHES */}
          {activeTab === 'materials' && (
            <div>
              {/* Flooring Selection (14 Materials) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    Architectural Flooring Materials (14 Real Physical Surfaces)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Select authentic materials featuring synchronized 2D plank/tile patterns and realistic 3D physical roughness.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {FLOOR_MATERIALS.map(mat => {
                    const isSelected = floorType === mat.type;
                    return (
                      <div
                        key={mat.type}
                        onClick={() => handleSelectFloor(mat)}
                        className="glass-panel"
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(194, 109, 83, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: mat.defaultHex, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mat.name}
                          </span>
                          <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)', display: 'block', textTransform: 'capitalize' }}>
                            {mat.category.replace('_', ' ')} • Roughness: {mat.roughness}
                          </span>
                        </div>
                        {isSelected && <Check size={16} className="text-terracotta" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wall Finishes */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                  Wall Finish Texture
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Controls surface sheen and light reflectivity in the 3D viewport.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                  {[
                    { id: 'matte', name: 'Matte Emulsion', desc: 'Flat, non-reflective velvety finish' },
                    { id: 'satin', name: 'Satin Lustre', desc: 'Silky delicate sheen reflecting accent lighting' },
                    { id: 'limewash', name: 'Textured Limewash', desc: 'Artisanal mineral plaster with subtle movement' },
                    { id: 'textured_plaster', name: 'Textured Plaster', desc: 'Earthy Venetian plaster texture' },
                    { id: 'exposed_brick', name: 'Exposed Brick', desc: 'Rustic textured masonry wall' },
                  ].map(fin => (
                    <button
                      key={fin.id}
                      type="button"
                      onClick={() => setWallFinish(fin.id as WallFinishType)}
                      className="btn"
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: wallFinish === fin.id ? 'rgba(194, 109, 83, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: wallFinish === fin.id ? '1px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.775rem', color: 'var(--text-main)' }}>{fin.name}</span>
                        {wallFinish === fin.id && <Check size={12} className="text-terracotta" />}
                      </div>
                      <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>{fin.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SAVED ROOM VARIANTS */}
          {activeTab === 'variants' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                  Room Design Variants (A/B Comparisons)
                </h3>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                  Save alternative color, furniture, and finish configurations for &quot;{room.name}&quot; to compare options.
                </p>
              </div>

              {/* Create new variant */}
              <form onSubmit={handleCreateVariant} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={newVariantName}
                  onChange={e => setNewVariantName(e.target.value)}
                  placeholder="Variant name (e.g. Option B — Contemporary Indian)"
                  className="input-field"
                  style={{ flex: 1, fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  Save Current State
                </button>
              </form>

              {/* List of saved variants */}
              {(!room.variants || room.variants.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No design variants saved for this room yet. Experiment with finishes and save an alternative option above!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {room.variants.map(variant => (
                    <div
                      key={variant.id}
                      className="glass-panel"
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', display: 'block' }}>
                          {variant.name}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                          Created: {new Date(variant.createdAt).toLocaleDateString()} • {variant.furniture?.length || 0} furniture pieces
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyVariant(variant)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.775rem' }}
                      >
                        Apply This Variant
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Whole-Home Scope Selector */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          {/* Scope Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)' }}>Apply Scope:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setApplyScope('this_room')}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  background: applyScope === 'this_room' ? 'var(--primary-clay)' : 'transparent',
                  color: applyScope === 'this_room' ? '#fff' : 'var(--text-muted)',
                }}
              >
                This Room ({room.name})
              </button>

              {project && (
                <>
                  <button
                    type="button"
                    onClick={() => setApplyScope('whole_home')}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      background: applyScope === 'whole_home' ? 'var(--primary-clay)' : 'transparent',
                      color: applyScope === 'whole_home' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    Whole Home ({project.rooms.length} Rooms)
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyScope('selected_rooms')}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      background: applyScope === 'selected_rooms' ? 'var(--primary-clay)' : 'transparent',
                      color: applyScope === 'selected_rooms' ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    Select Rooms...
                  </button>
                </>
              )}
            </div>

            {/* Room selection pills if selected_rooms */}
            {applyScope === 'selected_rooms' && project && (
              <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                {project.rooms.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRoomSelection(r.id)}
                    style={{
                      fontSize: '0.675rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                      background: selectedRoomIds.includes(r.id) ? 'rgba(194, 109, 83, 0.25)' : 'transparent',
                      color: selectedRoomIds.includes(r.id) ? '#fff' : 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    {r.name} {selectedRoomIds.includes(r.id) ? '✓' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResetToOriginal}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleCommitChanges}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 18px' }}
            >
              Apply Design Changes
            </button>
          </div>
        </div>

        {/* Transient notification toast */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            right: '24px',
            background: 'var(--primary-clay)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}>
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};
