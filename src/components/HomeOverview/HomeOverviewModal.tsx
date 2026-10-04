import React, { useState } from 'react';
import type { HomeProject, UnitType, RoomType } from '../../types/model';
import { evaluateRoomFit } from '../../utils/fitEngine';
import { formatDimension } from '../../utils/units';
import { 
  X, 
  Home, 
  Plus, 
  ArrowRight, 
  Trash2, 
  Copy,
  Building
} from 'lucide-react';

interface HomeOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: HomeProject;
  displayUnit: UnitType;
  onSelectRoom: (roomId: string) => void;
  onAddRoom: (name: string, type: RoomType, floorId: string, width: number, length: number) => void;
  onDeleteRoom: (roomId: string) => void;
  onDuplicateRoom: (roomId: string) => void;
}

export const HomeOverviewModal: React.FC<HomeOverviewModalProps> = ({
  isOpen,
  onClose,
  project,
  displayUnit,
  onSelectRoom,
  onAddRoom,
  onDeleteRoom,
  onDuplicateRoom,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Guest Bedroom');
  const [newRoomType, setNewRoomType] = useState<RoomType>('bedroom');
  const [newFloorId, setNewFloorId] = useState<string>(project.floors[0]?.id || 'floor-ground');
  const [newWidth, setNewWidth] = useState(380);
  const [newLength, setNewLength] = useState(420);

  if (!isOpen) return null;

  // Aggregate Home Spatial Metrics
  const totalAreaSqM = Math.round(
    project.rooms.reduce((acc, r) => acc + (r.width * r.length) / 10000, 0) * 10
  ) / 10;
  const totalAreaSqFt = Math.round(totalAreaSqM * 10.7639 * 10) / 10;
  const totalFurnitureCount = project.rooms.reduce((acc, r) => acc + (r.furniture?.length || 0), 0);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onAddRoom(newRoomName.trim(), newRoomType, newFloorId, newWidth, newLength);
    setShowAddForm(false);
    setNewRoomName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(94vw, 860px)', height: 'min(90vh, 820px)' }}
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
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(194, 109, 83, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Home size={18} className="text-terracotta" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {project.name} — Whole-Home Overview
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Multi-room spatial hierarchy, area totals, and fit validation
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Home Summary Metrics Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          padding: '16px 20px 8px',
        }}>
          <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Home Area</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-accent)' }}>
              {totalAreaSqM} m²
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>{totalAreaSqFt} sq ft</div>
          </div>

          <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Rooms</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {project.rooms.length}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Across {project.floors.length} Floor{project.floors.length > 1 ? 's' : ''}</div>
          </div>

          <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Furniture Items</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {totalFurnitureCount}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Planned pieces</div>
          </div>

          <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Room</div>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--primary-light)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {project.rooms.find(r => r.id === project.activeRoomId)?.name || 'Living'}
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Ready for edit</div>
          </div>
        </div>

        {/* Floors & Rooms List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {project.floors.map(floor => {
            const floorRooms = project.rooms.filter(r => r.floorId === floor.id);

            return (
              <div key={floor.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={16} className="text-sand-300" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {floor.name} ({floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {floorRooms.map(room => {
                    const roomReport = evaluateRoomFit(room, room.furniture || []);
                    const isActive = room.id === project.activeRoomId;
                    const area = Math.round(((room.width * room.length) / 10000) * 10) / 10;

                    return (
                      <div
                        key={room.id}
                        className="glass-panel"
                        style={{
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          border: isActive ? '2px solid var(--primary-light)' : '1px solid var(--border-subtle)',
                          background: isActive ? 'rgba(194, 109, 83, 0.08)' : undefined,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{room.name}</span>
                            {/* Fit Badge */}
                            {roomReport.overallStatus === 'PASS' && (
                              <span className="badge-pass" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                PASS
                              </span>
                            )}
                            {roomReport.overallStatus === 'FAIL' && (
                              <span className="badge-fail" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                {roomReport.summary.failCount} ISSUES
                              </span>
                            )}
                            {roomReport.overallStatus === 'REVIEW' && (
                              <span className="badge-review" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                REVIEW
                              </span>
                            )}
                            {roomReport.overallStatus === 'NOT_CHECKED' && (
                              <span className="badge-not-checked" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                EMPTY
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                            {formatDimension(room.width, displayUnit, false)} × {formatDimension(room.length, displayUnit)} • {area} m²
                          </div>

                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{room.furniture?.length || 0} pieces</span>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: room.finishes?.wallColor || '#F5F2EB' }} />
                              {room.finishes?.floorType?.replace('_', ' ') || 'oak'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                          <button
                            onClick={() => {
                              onSelectRoom(room.id);
                              onClose();
                            }}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', flex: 1 }}
                          >
                            <span>Open Room</span>
                            <ArrowRight size={13} />
                          </button>

                          <button
                            onClick={() => onDuplicateRoom(room.id)}
                            className="btn btn-ghost btn-icon"
                            style={{ width: '28px', height: '28px' }}
                            title="Duplicate room"
                          >
                            <Copy size={13} />
                          </button>

                          {project.rooms.length > 1 && (
                            <button
                              onClick={() => onDeleteRoom(room.id)}
                              className="btn btn-ghost btn-icon"
                              style={{ width: '28px', height: '28px', color: '#f87171' }}
                              title="Delete room"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Room Section */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-secondary"
              style={{ padding: '12px', borderStyle: 'dashed' }}
            >
              <Plus size={16} />
              <span>Add Another Room to Home</span>
            </button>
          ) : (
            <form onSubmit={handleCreateRoom} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Add New Room</span>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room Name</label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    placeholder="e.g., Guest Bedroom"
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room Type</label>
                  <select
                    value={newRoomType}
                    onChange={e => setNewRoomType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="bedroom">Bedroom</option>
                    <option value="living">Living Room</option>
                    <option value="dining">Dining Room</option>
                    <option value="office">Home Office</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="bathroom">Bathroom</option>
                    <option value="hallway">Hallway</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Floor</label>
                  <select
                    value={newFloorId}
                    onChange={e => setNewFloorId(e.target.value)}
                    className="input-field"
                  >
                    {project.floors.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Width ({displayUnit})
                  </label>
                  <input
                    type="number"
                    min={150}
                    value={newWidth}
                    onChange={e => setNewWidth(parseInt(e.target.value) || 300)}
                    className="input-field font-mono"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Length ({displayUnit})
                  </label>
                  <input
                    type="number"
                    min={150}
                    value={newLength}
                    onChange={e => setNewLength(parseInt(e.target.value) || 300)}
                    className="input-field font-mono"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  Create Room
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
