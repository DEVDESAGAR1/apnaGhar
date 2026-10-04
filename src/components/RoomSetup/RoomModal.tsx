import React, { useState } from 'react';
import type { RoomModel, RoomOpening, UnitType, WallSide, DoorSwing } from '../../types/model';
import { fromCm, toCm, formatDimension } from '../../utils/units';
import { X, Plus, Trash2, DoorOpen } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomModel;
  displayUnit: UnitType;
  onSaveRoom: (updatedRoom: RoomModel) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  room,
  displayUnit,
  onSaveRoom,
}) => {
  const [name, setName] = useState(room.name);
  const [width, setWidth] = useState(room.width);
  const [length, setLength] = useState(room.length);
  const [height, setHeight] = useState(room.height);
  const [wallThickness, setWallThickness] = useState(room.wallThickness || 15);
  const [openings, setOpenings] = useState<RoomOpening[]>([...(room.openings || [])]);

  if (!isOpen) return null;

  // Real-time spatial metrics
  const areaSqM = Math.round(((width * length) / 10000) * 10) / 10;
  const areaSqFt = Math.round(areaSqM * 10.7639 * 10) / 10;

  const handleAddOpening = (type: 'door' | 'window') => {
    const newOpening: RoomOpening = {
      id: `opening-${Date.now()}`,
      type,
      wall: 'south',
      offset: 50,
      width: type === 'door' ? 90 : 120,
      height: type === 'door' ? 210 : 140,
      sillHeight: type === 'window' ? 90 : 0,
      doorSwing: type === 'door' ? 'inward-left' : undefined,
      swingClearance: type === 'door' ? 90 : undefined,
    };
    setOpenings([...openings, newOpening]);
  };

  const handleRemoveOpening = (id: string) => {
    setOpenings(openings.filter(o => o.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRoom({
      ...room,
      name,
      width: Math.max(100, width),
      length: Math.max(100, length),
      height: Math.max(150, height),
      wallThickness: Math.max(5, wallThickness),
      openings,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 680px)', height: 'min(90vh, 780px)' }}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Room Specifications
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Define room enclosure dimensions, walls, and doorway clearance zones
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Room Name */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Room Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="e.g., Living Room, Bedroom, Studio"
            />
          </div>

          {/* Spatial Metrics Banner */}
          <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Floor Area</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{areaSqM} m² ({areaSqFt} sq ft)</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Dimensions</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {formatDimension(width, displayUnit, false)} × {formatDimension(length, displayUnit)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Ceiling Height</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {formatDimension(height, displayUnit)}
              </div>
            </div>
          </div>

          {/* Canonical Room Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Width (X: West to East)
              </label>
              <input
                type="number"
                required
                min={100}
                value={fromCm(width, displayUnit)}
                onChange={e => setWidth(Math.round(toCm(parseFloat(e.target.value) || 100, displayUnit)))}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Length (Y: North to South)
              </label>
              <input
                type="number"
                required
                min={100}
                value={fromCm(length, displayUnit)}
                onChange={e => setLength(Math.round(toCm(parseFloat(e.target.value) || 100, displayUnit)))}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Ceiling Height (Z)
              </label>
              <input
                type="number"
                required
                min={150}
                value={fromCm(height, displayUnit)}
                onChange={e => setHeight(Math.round(toCm(parseFloat(e.target.value) || 150, displayUnit)))}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Wall Thickness
              </label>
              <input
                type="number"
                required
                min={5}
                value={fromCm(wallThickness, displayUnit)}
                onChange={e => setWallThickness(Math.round(toCm(parseFloat(e.target.value) || 15, displayUnit)))}
                className="input-field font-mono"
              />
            </div>
          </div>

          {/* Wall Openings: Doors & Windows */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Doors & Windows ({openings.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                  Doors evaluate inward/outward clearance zones to prevent furniture blockage
                </p>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleAddOpening('door')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Plus size={13} />
                  <span>Add Door</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOpening('window')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Plus size={13} />
                  <span>Add Window</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {openings.map((opening, idx) => (
                <div
                  key={opening.id}
                  className="glass-panel"
                  style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                      <DoorOpen size={16} className="text-sky-400" />
                      <span>{opening.type === 'door' ? `Door ${idx + 1}` : `Window ${idx + 1}`}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOpening(opening.id)}
                      className="btn btn-ghost btn-icon"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <Trash2 size={14} className="text-rose-400" />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Wall</label>
                      <select
                        value={opening.wall}
                        onChange={e => {
                          const updated = openings.map(o => o.id === opening.id ? { ...o, wall: e.target.value as WallSide } : o);
                          setOpenings(updated);
                        }}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <option value="north">North Wall (Top)</option>
                        <option value="south">South Wall (Bottom)</option>
                        <option value="west">West Wall (Left)</option>
                        <option value="east">East Wall (Right)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Offset ({displayUnit})</label>
                      <input
                        type="number"
                        min={0}
                        value={fromCm(opening.offset, displayUnit)}
                        onChange={e => {
                          const val = toCm(parseFloat(e.target.value) || 0, displayUnit);
                          setOpenings(openings.map(o => o.id === opening.id ? { ...o, offset: Math.round(val) } : o));
                        }}
                        className="input-field font-mono"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Width ({displayUnit})</label>
                      <input
                        type="number"
                        min={30}
                        value={fromCm(opening.width, displayUnit)}
                        onChange={e => {
                          const val = toCm(parseFloat(e.target.value) || 30, displayUnit);
                          setOpenings(openings.map(o => o.id === opening.id ? { ...o, width: Math.round(val), swingClearance: Math.round(val) } : o));
                        }}
                        className="input-field font-mono"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      />
                    </div>

                    {opening.type === 'door' ? (
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Door Swing</label>
                        <select
                          value={opening.doorSwing || 'inward-left'}
                          onChange={e => {
                            const updated = openings.map(o => o.id === opening.id ? { ...o, doorSwing: e.target.value as DoorSwing } : o);
                            setOpenings(updated);
                          }}
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <option value="inward-left">Inward (Left Hinge)</option>
                          <option value="inward-right">Inward (Right Hinge)</option>
                          <option value="outward-left">Outward</option>
                          <option value="sliding">Sliding / Pocket</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Sill Height ({displayUnit})</label>
                        <input
                          type="number"
                          min={0}
                          value={fromCm(opening.sillHeight || 90, displayUnit)}
                          onChange={e => {
                            const val = toCm(parseFloat(e.target.value) || 0, displayUnit);
                            setOpenings(openings.map(o => o.id === opening.id ? { ...o, sillHeight: Math.round(val) } : o));
                          }}
                          className="input-field font-mono"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
              Save Room Specifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
