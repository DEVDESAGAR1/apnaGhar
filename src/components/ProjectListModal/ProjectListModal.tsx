import React, { useState } from 'react';
import { listSavedProjects } from '../../utils/storage';
import { X, Plus, FolderOpen } from 'lucide-react';

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateNewProject: (name: string, width: number, length: number) => void;
}

export const ProjectListModal: React.FC<ProjectListModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  onSelectProject,
  onCreateNewProject,
}) => {
  const projects = listSavedProjects();
  const [newProjectName, setNewProjectName] = useState('My New Room');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateNewProject(newProjectName, 420, 500);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(92vw, 540px)', height: 'min(80vh, 600px)' }}
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
            Projects Directory
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
              style={{ padding: '10px' }}
            >
              <Plus size={16} />
              <span>Create New Project</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Create New Project</span>
              <input
                type="text"
                required
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Room Project Name"
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
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Saved Projects</span>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No saved projects found.
              </div>
            ) : (
              projects.map(p => {
                const isActive = p.id === activeProjectId;

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
                      border: isActive ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                      background: isActive ? 'rgba(56, 189, 248, 0.08)' : undefined,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderOpen size={16} className={isActive ? 'text-sky-400' : 'text-slate-400'} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                        {isActive && (
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {p.itemCount} items • Modified {new Date(p.updatedAt).toLocaleDateString()}
                      </div>
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
