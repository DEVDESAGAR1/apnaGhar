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
  Building,
  Edit2,
  Check,
  ArrowUp,
  ArrowDown,
  Palette,
  AlertTriangle
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
  onRenameRoom?: (roomId: string, newName: string) => void;
  onReorderRooms?: (orderedRoomIds: string[]) => void;
  onOpenStyling?: () => void;
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
  onRenameRoom,
  onReorderRooms,
  onOpenStyling,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Guest Bedroom');
  const [newRoomType, setNewRoomType] = useState<RoomType>('bedroom');
  const [newFloorId, setNewFloorId] = useState<string>(project.floors[0]?.id || 'floor-ground');
  const [newWidth, setNewWidth] = useState(380);
  const [newLength, setNewLength] = useState(420);

  // Inline rename state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleStartRename = (roomId: string, currentName: string) => {
    setEditingRoomId(roomId);
    setEditingName(currentName);
  };

  const handleSaveRename = (roomId: string) => {
    if (editingName.trim() && onRenameRoom) {
      onRenameRoom(roomId, editingName.trim());
    }
    setEditingRoomId(null);
  };

  const handleMoveRoom = (roomId: string, direction: 'up' | 'down') => {
    if (!onReorderRooms) return;
    const currentIndex = project.rooms.findIndex(r => r.id === roomId);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= project.rooms.length) return;

    const newOrder = [...project.rooms.map(r => r.id)];
    const temp = newOrder[currentIndex];
    newOrder[currentIndex] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    onReorderRooms(newOrder);
  };

  const roomToDelete = confirmDeleteId ? project.rooms.find(r => r.id === confirmDeleteId) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(94vw, 880px)', height: 'min(90vh, 840px)', display: 'flex', flexDirection: 'column' }}
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
                {project.name} — Whole-Home Dashboard
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Multi-room spatial hierarchy, area totals, ordering, and design consistency
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Dashboard Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {/* Spatial Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div className="glass-panel" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Rooms</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {project.rooms.length}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Floors</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {project.floors.length}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Area</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {totalAreaSqM} m²
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>({totalAreaSqFt} sq ft)</span>
            </div>

            <div className="glass-panel" style={{ padding: '12px 14px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Items</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {totalFurnitureCount}
              </div>
            </div>
          </div>

          {/* Whole-Home Design Style & Palettes Banner */}
          <div className="glass-panel" style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
            background: 'linear-gradient(135deg, rgba(194, 109, 83, 0.08) 0%, rgba(203, 144, 77, 0.04) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={16} className="text-terracotta" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Whole-Home Styling & Palette
                </span>
                {project.wholeHomeStyling?.preferredStyle && (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(194, 109, 83, 0.2)', color: 'var(--primary-clay)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {project.wholeHomeStyling.preferredStyle.replace(/-/g, ' ')}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Coordinate wall colors, flooring materials, and architectural finishes across your entire home.
              </p>
            </div>

            {onOpenStyling && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStyling();
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Palette size={14} />
                <span>Customize Whole-Home Design</span>
              </button>
            )}
          </div>

          {/* Empty State when 0 rooms */}
          {project.rooms.length === 0 && (
            <div className="glass-panel" style={{
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}>
              <Home size={36} className="text-terracotta" style={{ opacity: 0.6 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>No rooms in this home yet</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
                Start designing your home by adding your first room below. Enter dimensions and units to begin planning.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary"
                style={{ marginTop: '8px', fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                <span>Add Your First Room</span>
              </button>
            </div>
          )}

          {/* Floors & Rooms Listing */}
          {project.floors.map(floor => {
            const floorRooms = project.rooms.filter(r => r.floorId === floor.id);
            if (floorRooms.length === 0 && project.floors.length > 1) return null;

            return (
              <div key={floor.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Building size={16} className="text-terracotta" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {floor.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    ({floorRooms.length} room{floorRooms.length === 1 ? '' : 's'})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {floorRooms.map((room) => {
                    const roomReport = evaluateRoomFit(room);
                    const area = Math.round((room.width * room.length) / 10000 * 10) / 10;
                    const isEditing = editingRoomId === room.id;
                    const roomIdx = project.rooms.findIndex(r => r.id === room.id);

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
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          {/* Room Header: Name / Edit Name */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1, marginRight: '8px' }}>
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={e => setEditingName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(room.id); }}
                                  autoFocus
                                  className="input-field"
                                  style={{ fontSize: '0.85rem', padding: '2px 6px', flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(room.id)}
                                  className="btn btn-primary btn-icon"
                                  style={{ width: '26px', height: '26px' }}
                                >
                                  <Check size={13} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                  {room.name}
                                </span>
                                {onRenameRoom && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartRename(room.id, room.name)}
                                    className="btn btn-ghost btn-icon"
                                    style={{ width: '22px', height: '22px', color: 'var(--text-dim)' }}
                                    title="Rename room"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Fit status badge */}
                            <div>
                              {roomReport.overallStatus === 'PASS' && (
                                <span className="badge-pass" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  ALL PASS
                                </span>
                              )}
                              {roomReport.overallStatus === 'FAIL' && (
                                <span className="badge-fail" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  COLLISION
                                </span>
                              )}
                              {roomReport.overallStatus === 'REVIEW' && (
                                <span className="badge-review" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  CLEARANCE
                                </span>
                              )}
                              {roomReport.overallStatus === 'NOT_CHECKED' && (
                                <span className="badge-not-checked" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  EMPTY
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                            {formatDimension(room.width, displayUnit, false)} × {formatDimension(room.length, displayUnit)} • {area} m²
                          </div>

                          {/* Finishes and Furniture count */}
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{room.furniture?.length || 0} pieces</span>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: room.finishes?.wallColor || '#F5F2EB', border: '1px solid #fff' }} />
                              {room.finishes?.floorType?.replace(/_/g, ' ') || 'oak'}
                            </span>
                          </div>
                        </div>

                        {/* Room Card Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
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

                          {/* Reordering arrows */}
                          {onReorderRooms && project.rooms.length > 1 && (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                type="button"
                                disabled={roomIdx === 0}
                                onClick={() => handleMoveRoom(room.id, 'up')}
                                className="btn btn-ghost btn-icon"
                                style={{ width: '26px', height: '26px', opacity: roomIdx === 0 ? 0.3 : 1 }}
                                title="Move up in order"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={roomIdx === project.rooms.length - 1}
                                onClick={() => handleMoveRoom(room.id, 'down')}
                                className="btn btn-ghost btn-icon"
                                style={{ width: '26px', height: '26px', opacity: roomIdx === project.rooms.length - 1 ? 0.3 : 1 }}
                                title="Move down in order"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          )}

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
                              onClick={() => setConfirmDeleteId(room.id)}
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

        {/* Delete Confirmation Modal Overlay */}
        {confirmDeleteId && roomToDelete && (
          <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setConfirmDeleteId(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 'min(90vw, 420px)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', marginBottom: '10px' }}>
                <AlertTriangle size={24} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Delete Room?</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                Are you sure you want to delete &quot;<strong>{roomToDelete.name}</strong>&quot;? All furniture placements and finishes in this room will be removed.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRoom(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="btn btn-danger"
                  style={{ fontSize: '0.8rem', background: '#dc2626', color: '#fff' }}
                >
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
