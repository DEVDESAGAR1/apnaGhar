import React, { useState } from 'react';
import type { FurnitureItem, UnitType, RoomModel } from '../../types/model';
import { FURNITURE_CATALOG, createFurnitureFromCatalog, type CatalogTemplate } from '../../utils/catalog';
import { formatDimension, toCm, fromCm } from '../../utils/units';
import { X, Plus, Search } from 'lucide-react';

interface CatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
  displayUnit: UnitType;
  onAddFurniture: (item: FurnitureItem) => void;
}

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  isOpen,
  onClose,
  room,
  displayUnit,
  onAddFurniture,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom piece form state
  const [customName, setCustomName] = useState('Custom Furniture');
  const [customCategory, setCustomCategory] = useState<FurnitureItem['category']>('seating');
  const [customWidth, setCustomWidth] = useState(120);
  const [customDepth, setCustomDepth] = useState(70);
  const [customHeight, setCustomHeight] = useState(75);
  const [customClearanceFront, setCustomClearanceFront] = useState(50);
  const [customColor, setCustomColor] = useState('#3d5a80');

  if (!isOpen) return null;

  const filteredTemplates = FURNITURE_CATALOG.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddTemplate = (template: CatalogTemplate) => {
    const newItem = createFurnitureFromCatalog(template, room.width, room.length);
    onAddFurniture(newItem);
    onClose();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom-${Date.now()}`;
    const newItem: FurnitureItem = {
      id,
      name: customName,
      category: customCategory,
      width: customWidth,
      depth: customDepth,
      height: customHeight,
      x: Math.round(room.width / 2),
      y: Math.round(room.length / 2),
      z: 0,
      rotation: 0,
      color: customColor,
      modelType: customCategory === 'seating' ? 'sofa_3seater' : customCategory === 'bed' ? 'bed_queen' : 'desk',
      clearances: customClearanceFront > 0 ? { front: customClearanceFront } : {},
      provenance: 'manual',
      isConfirmed: true,
      provenanceNotes: 'Custom piece created by user with verified dimensions.',
    };
    onAddFurniture(newItem);
    onClose();
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
              Furniture Catalog
            </h2>
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              marginLeft: '12px',
            }}>
              <button
                onClick={() => setActiveTab('catalog')}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  background: activeTab === 'catalog' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'catalog' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Catalog ({FURNITURE_CATALOG.length})
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  background: activeTab === 'custom' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'custom' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Custom Dimensions
              </button>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {activeTab === 'catalog' ? (
          <>
            {/* Search and Category Filters */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} className="text-slate-400" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search sofa, bed, desk, table, plant..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '34px' }}
                />
              </div>

              {/* Categories */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'seating', label: 'Seating' },
                  { id: 'bed', label: 'Beds' },
                  { id: 'table', label: 'Tables' },
                  { id: 'desk', label: 'Desks' },
                  { id: 'storage', label: 'Storage' },
                  { id: 'decor', label: 'Decor' },
                  { id: 'lighting', label: 'Lighting' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: categoryFilter === cat.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: categoryFilter === cat.id ? '#38bdf8' : 'var(--text-muted)',
                      border: categoryFilter === cat.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {filteredTemplates.map((template, idx) => (
                <div
                  key={idx}
                  className="glass-panel"
                  style={{
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: template.color }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{template.name}</span>
                      </div>
                      {template.estimatedPrice && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>
                          ${template.estimatedPrice}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                      {template.description}
                    </p>

                    <div style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-dim)',
                    }}>
                      <span>{formatDimension(template.width, displayUnit)} W</span>
                      <span>×</span>
                      <span>{formatDimension(template.depth, displayUnit)} D</span>
                      <span>×</span>
                      <span>{formatDimension(template.height, displayUnit)} H</span>
                    </div>

                    {template.clearances.front && (
                      <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginTop: '4px' }}>
                        Front clearance: {formatDimension(template.clearances.front, displayUnit)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddTemplate(template)}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Plus size={14} />
                    <span>Add to Room</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Custom Furniture Form */
          <form onSubmit={handleAddCustom} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Item Name
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="input-field"
                placeholder="e.g., Antique Wooden Armoire"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value as any)}
                  className="input-field"
                >
                  <option value="seating">Seating</option>
                  <option value="table">Table</option>
                  <option value="bed">Bed</option>
                  <option value="storage">Storage</option>
                  <option value="desk">Desk</option>
                  <option value="lighting">Lighting</option>
                  <option value="decor">Decor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    style={{ width: '42px', height: '36px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{customColor}</span>
                </div>
              </div>
            </div>

            {/* Custom Dimensions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Width ({displayUnit})
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  value={fromCm(customWidth, displayUnit)}
                  onChange={e => setCustomWidth(Math.round(toCm(parseFloat(e.target.value) || 10, displayUnit)))}
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Depth ({displayUnit})
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  value={fromCm(customDepth, displayUnit)}
                  onChange={e => setCustomDepth(Math.round(toCm(parseFloat(e.target.value) || 10, displayUnit)))}
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Height ({displayUnit})
                </label>
                <input
                  type="number"
                  required
                  min={10}
                  value={fromCm(customHeight, displayUnit)}
                  onChange={e => setCustomHeight(Math.round(toCm(parseFloat(e.target.value) || 10, displayUnit)))}
                  className="input-field font-mono"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Front Clearance Buffer ({displayUnit})
              </label>
              <input
                type="number"
                min={0}
                value={fromCm(customClearanceFront, displayUnit)}
                onChange={e => setCustomClearanceFront(Math.round(toCm(parseFloat(e.target.value) || 0, displayUnit)))}
                className="input-field font-mono"
                placeholder="Recommended space for drawer pullout or human access"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Space reserved in front of drawers, doors, or seating.
              </span>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
                <Plus size={16} />
                <span>Add Custom Furniture Piece</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
