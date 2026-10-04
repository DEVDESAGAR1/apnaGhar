import React, { useState } from 'react';
import { listSavedProjects, deleteProject } from '../../utils/storage';
import { X, Plus, FolderOpen, Trash2, Home, Sparkles } from 'lucide-react';

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateNewProject: (name: string, width?: number, length?: number) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProjectListModal: React.FC<ProjectListModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  onSelectProject,
  onCreateNewProject,
  onDeleteProject,
}) => {
  const [projectList, setProjectList] = useState(listSavedProjects());
  const [newProjectName, setNewProjectName] = useState('My Dream Home');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshList = () => {
    setProjectList(listSavedProjects());
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateNewProject(newProjectName.trim(), 420, 500);
    setShowCreateForm(false);
    setNewProjectName('My New Home');
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, pId: string) => {
    e.stopPropagation();
    deleteProject(pId);
    if (onDeleteProject) {
      onDeleteProject(pId);
    }
    setConfirmDeleteId(null);
    refreshList();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 580px)', height: 'min(82vh, 640px)', display: 'flex', flexDirection: 'column' }}
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
              Homes & Projects Directory
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Manage and switch between your whole-home projects and sample demonstration rooms
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
              style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              <span>Create New Whole-Home Project</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Create New Home Project</span>
              <input
                type="text"
                required
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="e.g., Lakeview Apartment, Villa 42"
                className="input-field"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  Create Project
                </button>
              </div>
            </form>
          )}

          {/* Project List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Saved Projects ({projectList.length})
            </span>

            {projectList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No saved projects found.
              </div>
            ) : (
              projectList.map(p => {
                const isActive = p.id === activeProjectId;
                const isSample = p.isSample || p.id.includes('sample') || p.id.includes('demo');

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      onClose();
                    }}
                    className="glass-panel"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--primary-clay)' : '1px solid var(--border-subtle)',
                      background: isActive ? 'rgba(194, 109, 83, 0.1)' : undefined,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Home size={16} className={isActive ? 'text-terracotta' : 'text-slate-400'} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>

                        {isSample && (
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}>
                            SAMPLE / DEMO
                          </span>
                        )}

                        {isActive && (
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(194, 109, 83, 0.25)', color: 'var(--primary-clay)', fontWeight: 700 }}>
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {p.roomCount || 1} room{(p.roomCount || 1) === 1 ? '' : 's'} • {p.itemCount} furniture piece{p.itemCount === 1 ? '' : 's'} • Updated {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isSample && projectList.length > 1 && (
                        confirmDeleteId === p.id ? (
                          <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={e => handleDelete(e, p.id)}
                              className="btn btn-danger"
                              style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#dc2626', color: '#fff' }}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                            className="btn btn-ghost btn-icon"
                            style={{ width: '28px', height: '28px', color: '#f87171' }}
                            title="Delete project"
                          >
                            <Trash2 size={13} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
