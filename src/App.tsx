import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { 
  HomeProject, 
  FurnitureItem, 
  RoomModel, 
  PhotoContext, 
  AppSettings, 
  UnitType,
  RoomType,
  RoomMaterialFinish,
  DesignVariant,
  WholeHomeStyleConfig
} from './types/model';
import { 
  loadActiveProject, 
  loadProjectById,
  saveProject, 
  createNewProject, 
  createSampleDemoProject,
  deleteProject,
  addRoomToHome,
  deleteRoomFromHome,
  duplicateRoomInHome,
  renameRoomInHome,
  reorderRoomsInHome,
  applyWholeHomeStyling
} from './utils/storage';
import { evaluateRoomFit } from './utils/fitEngine';
import { Navbar } from './components/Navbar';
import { Canvas2D } from './components/Planner2D/Canvas2D';
import { ThreeViewer } from './components/Viewer3D/ThreeViewer';
import { FitReportModal } from './components/FitReport/FitReportModal';
import { CatalogDrawer } from './components/FurnitureCatalog/CatalogDrawer';
import { RoomModal } from './components/RoomSetup/RoomModal';
import { PhotoUploadModal } from './components/PhotoAI/PhotoUploadModal';
import { ExportModal } from './components/ExportModal/ExportModal';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { ProjectListModal } from './components/ProjectListModal/ProjectListModal';
import { StylingModal } from './components/Styling/StylingModal';
import { HomeOverviewModal } from './components/HomeOverview/HomeOverviewModal';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Canonical Multi-Room Home Project State
  const [project, setProject] = useState<HomeProject>(() => loadActiveProject());

  // Active View: 2D Interactive Planner vs 3D Spatial Viewer
  const [activeView, setActiveView] = useState<'2d' | '3d'>('2d');

  // Currently selected furniture item in either 2D or 3D
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Modal Visibility State
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isRoomSetupOpen, setIsRoomSetupOpen] = useState(false);
  const [isPhotoAIOpen, setIsPhotoAIOpen] = useState(false);
  const [isFitReportOpen, setIsFitReportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [isStylingOpen, setIsStylingOpen] = useState(false);
  const [isHomeOverviewOpen, setIsHomeOverviewOpen] = useState(false);

  // Auto-save project whenever it changes
  useEffect(() => {
    saveProject(project);
  }, [project]);

  // Active Room Resolution
  const activeRoom: RoomModel = useMemo(() => {
    const found = project.rooms.find(r => r.id === project.activeRoomId);
    return found || project.rooms[0] || project.room;
  }, [project.rooms, project.activeRoomId, project.room]);

  // Active Furniture for current room
  const activeFurniture: FurnitureItem[] = useMemo(() => {
    return activeRoom.furniture || [];
  }, [activeRoom.furniture]);

  // Pure geometric fit check evaluation for active room
  const fitReport = useMemo(() => {
    return evaluateRoomFit(activeRoom, activeFurniture);
  }, [activeRoom, activeFurniture]);

  // Room switching
  const handleSelectRoom = useCallback((roomId: string) => {
    setProject(prev => {
      const room = prev.rooms.find(r => r.id === roomId);
      return {
        ...prev,
        activeRoomId: roomId,
        activeFloorId: room?.floorId || prev.activeFloorId,
        updatedAt: new Date().toISOString(),
      };
    });
    setSelectedItemId(null);
  }, []);

  // Furniture updates in active room
  const handleUpdateFurniture = useCallback((items: FurnitureItem[]) => {
    setProject(prev => {
      const updatedRooms = prev.rooms.map(r => 
        r.id === activeRoom.id ? { ...r, furniture: items } : r
      );
      return {
        ...prev,
        rooms: updatedRooms,
        furniture: items, // backward compat
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeRoom.id]);

  const handleAddFurniture = useCallback((item: FurnitureItem) => {
    setProject(prev => {
      const currentItems = activeRoom.furniture || [];
      const nextItems = [...currentItems, item];
      const updatedRooms = prev.rooms.map(r =>
        r.id === activeRoom.id ? { ...r, furniture: nextItems } : r
      );
      return {
        ...prev,
        rooms: updatedRooms,
        furniture: nextItems, // backward compat
        updatedAt: new Date().toISOString(),
      };
    });
    setSelectedItemId(item.id);
  }, [activeRoom.id, activeRoom.furniture]);

  // Room specifications updates
  const handleSaveRoom = useCallback((updatedRoom: RoomModel) => {
    setProject(prev => {
      const updatedRooms = prev.rooms.map(r =>
        r.id === updatedRoom.id 
          ? { ...updatedRoom, furniture: r.furniture, finishes: r.finishes, variants: r.variants } 
          : r
      );
      return {
        ...prev,
        rooms: updatedRooms,
        room: updatedRoom, // backward compat
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Room material finishes update
  const handleUpdateFinishes = useCallback((finishes: RoomMaterialFinish) => {
    setProject(prev => {
      const updatedRooms = prev.rooms.map(r =>
        r.id === activeRoom.id ? { ...r, finishes } : r
      );
      return {
        ...prev,
        rooms: updatedRooms,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeRoom.id]);

  // Design variants: Save current state as alternative
  const handleSaveVariant = useCallback((variantName: string) => {
    setProject(prev => {
      const currentRoom = prev.rooms.find(r => r.id === activeRoom.id);
      if (!currentRoom) return prev;
      const newVariant: DesignVariant = {
        id: `variant-${Date.now()}`,
        name: variantName,
        createdAt: new Date().toISOString(),
        finishes: { ...(currentRoom.finishes || { wallColor: '#F5F2EB', wallFinish: 'matte', floorType: 'hardwood_oak', floorColor: '#C49A6C' }) },
        furniture: JSON.parse(JSON.stringify(currentRoom.furniture || [])),
      };
      const updatedRooms = prev.rooms.map(r =>
        r.id === currentRoom.id ? {
          ...r,
          variants: [...(r.variants || []), newVariant],
        } : r
      );
      return {
        ...prev,
        rooms: updatedRooms,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeRoom.id]);

  // Design variants: Apply saved variant
  const handleApplyVariant = useCallback((variant: DesignVariant) => {
    setProject(prev => {
      const updatedRooms = prev.rooms.map(r =>
        r.id === activeRoom.id ? {
          ...r,
          finishes: { ...variant.finishes },
          furniture: JSON.parse(JSON.stringify(variant.furniture)),
        } : r
      );
      return {
        ...prev,
        rooms: updatedRooms,
        furniture: variant.furniture, // backward compat
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeRoom.id]);

  // Add room to home
  const handleAddRoom = useCallback((name: string, type: RoomType, floorId: string, width: number, length: number) => {
    setProject(prev => {
      const updated = addRoomToHome(prev, name, type, floorId, width, length);
      return updated;
    });
    setSelectedItemId(null);
  }, []);

  // Delete room from home
  const handleDeleteRoom = useCallback((roomId: string) => {
    setProject(prev => {
      const updated = deleteRoomFromHome(prev, roomId);
      return updated;
    });
    setSelectedItemId(null);
  }, []);

  // Duplicate room in home
  const handleDuplicateRoom = useCallback((roomId: string) => {
    setProject(prev => {
      const updated = duplicateRoomInHome(prev, roomId);
      return updated;
    });
    setSelectedItemId(null);
  }, []);

  // Photo context updates
  const handleUpdatePhotoContext = useCallback((context: PhotoContext) => {
    setProject(prev => ({
      ...prev,
      photoContext: context,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // App settings updates
  const handleUpdateSettings = useCallback((updatedSettings: AppSettings) => {
    setProject(prev => ({
      ...prev,
      settings: updatedSettings,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Display unit change
  const handleUnitChange = useCallback((unit: UnitType) => {
    setProject(prev => ({
      ...prev,
      settings: { ...prev.settings, displayUnit: unit },
    }));
  }, []);

  // Single Item Confirmation helper (from fit report or inspector)
  const handleConfirmItem = useCallback((itemId: string) => {
    setProject(prev => {
      const updatedRooms = prev.rooms.map(r => {
        if (r.id !== activeRoom.id) return r;
        const updatedFurniture = (r.furniture || []).map(f => f.id === itemId ? {
          ...f,
          isConfirmed: true,
          provenance: 'manual' as const,
          provenanceNotes: 'Confirmed by user after review.',
        } : f);
        return { ...r, furniture: updatedFurniture };
      });
      return {
        ...prev,
        rooms: updatedRooms,
        furniture: (prev.furniture || []).map(f => f.id === itemId ? {
          ...f,
          isConfirmed: true,
          provenance: 'manual' as const,
          provenanceNotes: 'Confirmed by user after review.',
        } : f),
      };
    });
  }, [activeRoom.id]);

  // Load new or imported project
  const handleLoadProject = useCallback((newProject: HomeProject) => {
    setProject(newProject);
    setSelectedItemId(null);
  }, []);

  // Create new project
  const handleCreateNewProject = useCallback((name: string) => {
    const fresh = createNewProject(name);
    setProject(fresh);
    saveProject(fresh);
    setSelectedItemId(null);
  }, []);

  // Reset & Purge all local data
  const handlePurgeAllData = useCallback(() => {
    localStorage.clear();
    const demo = createSampleDemoProject();
    setProject(demo);
    saveProject(demo);
    setSelectedItemId(null);
  }, []);

  // Switch to another project by ID
  const handleSelectProject = useCallback((projectId: string) => {
    const loaded = loadProjectById(projectId);
    if (loaded) {
      setProject(loaded);
      setSelectedItemId(null);
    }
  }, []);

  // Delete project
  const handleDeleteProject = useCallback((projectId: string) => {
    deleteProject(projectId);
  }, []);

  // Rename room in home
  const handleRenameRoom = useCallback((roomId: string, newName: string) => {
    setProject(prev => {
      const updated = renameRoomInHome(prev, roomId, newName);
      saveProject(updated);
      return updated;
    });
  }, []);

  // Reorder rooms in home
  const handleReorderRooms = useCallback((newOrderedRoomIds: string[]) => {
    setProject(prev => {
      const updated = reorderRoomsInHome(prev, newOrderedRoomIds);
      saveProject(updated);
      return updated;
    });
  }, []);

  // Apply whole-home styling across rooms
  const handleApplyWholeHomeStyling = useCallback((
    stylingConfig: WholeHomeStyleConfig,
    targetRoomIds?: string[],
    _preserveCustomizedRooms?: boolean
  ) => {
    setProject(prev => {
      const scope = targetRoomIds && targetRoomIds.length > 0 ? 'selected' : 'all';
      const updated = applyWholeHomeStyling(prev, stylingConfig, scope, targetRoomIds);
      saveProject(updated);
      return updated;
    });
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-canvas)',
    }}>
      {/* Top Header & Navigation */}
      <Navbar
        project={project}
        activeRoom={activeRoom}
        activeView={activeView}
        onViewChange={setActiveView}
        onSelectRoom={handleSelectRoom}
        onOpenHomeOverview={() => setIsHomeOverviewOpen(true)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenRoomSetup={() => setIsRoomSetupOpen(true)}
        onOpenPhotoAI={() => setIsPhotoAIOpen(true)}
        onOpenFitReport={() => setIsFitReportOpen(true)}
        onOpenStyling={() => setIsStylingOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProjectList={() => setIsProjectListOpen(true)}
        onUnitChange={handleUnitChange}
        fitReport={fitReport}
      />

      {/* Main View Area (2D Planner or 3D Spatial Visualizer) */}
      <main style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100vh - 62px)', overflow: 'hidden' }}>
        {/* Priority 2: Prominent "Analyze My Room" Primary CTA Banner */}
        <div 
          className="analyze-room-cta-banner glass-panel" 
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75)',
            border: '1px solid rgba(194, 109, 83, 0.4)',
            maxWidth: 'min(94vw, 600px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} className="text-terracotta" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {project.isSample ? 'Sample Demonstration Layout' : 'Room Assistant'}
              </span>
              {project.isSample && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  fontWeight: 700,
                }}>
                  SAMPLE / DEMO
                </span>
              )}
              {project.photoContext.hasPhoto && !project.isSample && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 600,
                }}>
                  Photo Active
                </span>
              )}
            </div>
            <p style={{
              fontSize: '0.725rem',
              color: 'var(--text-muted)',
              margin: '2px 0 0 0',
              lineHeight: 1.35,
              whiteSpace: 'normal',
            }}>
              {project.isSample 
                ? 'Predefined demonstration data. You can freely edit furniture, or upload your own real room photo.'
                : 'Upload a room photo to evaluate spatial fit, or browse sample rooms without uploading.'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              id="btn-analyze-my-room"
              onClick={() => setIsPhotoAIOpen(true)}
              className="btn btn-primary"
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                gap: '6px',
              }}
            >
              <Sparkles size={14} />
              <span>Design My Room</span>
            </button>
            <button
              id="btn-explore-samples"
              onClick={() => setIsProjectListOpen(true)}
              className="btn btn-secondary"
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 12px',
                fontSize: '0.8rem',
                gap: '6px',
              }}
            >
              <span>Explore Samples</span>
            </button>
          </div>
        </div>

        {activeView === '2d' ? (
          <Canvas2D
            room={activeRoom}
            furniture={activeFurniture}
            settings={project.settings}
            fitReport={fitReport}
            onUpdateFurniture={handleUpdateFurniture}
            onSelectItem={item => setSelectedItemId(item ? item.id : null)}
            selectedItemId={selectedItemId}
          />
        ) : (
          <ThreeViewer
            room={activeRoom}
            furniture={activeFurniture}
            fitReport={fitReport}
            displayUnit={project.settings.displayUnit}
            selectedItemId={selectedItemId}
            onSelectItem={item => setSelectedItemId(item ? item.id : null)}
            onUpdateFurniture={handleUpdateFurniture}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <FitReportModal
        isOpen={isFitReportOpen}
        onClose={() => setIsFitReportOpen(false)}
        report={fitReport}
        furniture={activeFurniture}
        onSelectItem={id => {
          setSelectedItemId(id);
          setActiveView('2d');
        }}
        onConfirmItem={handleConfirmItem}
      />

      <CatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        room={activeRoom}
        displayUnit={project.settings.displayUnit}
        onAddFurniture={handleAddFurniture}
      />

      <RoomModal
        isOpen={isRoomSetupOpen}
        onClose={() => setIsRoomSetupOpen(false)}
        room={activeRoom}
        displayUnit={project.settings.displayUnit}
        onSaveRoom={handleSaveRoom}
      />

      <StylingModal
        isOpen={isStylingOpen}
        onClose={() => setIsStylingOpen(false)}
        room={activeRoom}
        project={project}
        onUpdateFinishes={handleUpdateFinishes}
        onSaveVariant={handleSaveVariant}
        onApplyVariant={handleApplyVariant}
        onApplyWholeHomeStyling={handleApplyWholeHomeStyling}
      />

      <HomeOverviewModal
        isOpen={isHomeOverviewOpen}
        onClose={() => setIsHomeOverviewOpen(false)}
        project={project}
        displayUnit={project.settings.displayUnit}
        onSelectRoom={handleSelectRoom}
        onAddRoom={handleAddRoom}
        onDeleteRoom={handleDeleteRoom}
        onDuplicateRoom={handleDuplicateRoom}
        onRenameRoom={handleRenameRoom}
        onReorderRooms={handleReorderRooms}
        onOpenStyling={() => setIsStylingOpen(true)}
      />

      <PhotoUploadModal
        isOpen={isPhotoAIOpen}
        onClose={() => setIsPhotoAIOpen(false)}
        room={activeRoom}
        photoContext={project.photoContext}
        settings={project.settings}
        displayUnit={project.settings.displayUnit}
        onUpdatePhotoContext={handleUpdatePhotoContext}
        onAddFurniture={handleAddFurniture}
        onUpdateFurniture={handleUpdateFurniture}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        fitReport={fitReport}
        displayUnit={project.settings.displayUnit}
        onLoadProject={handleLoadProject}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={project.settings}
        onUpdateSettings={handleUpdateSettings}
        onPurgeAllData={handlePurgeAllData}
      />

      <ProjectListModal
        isOpen={isProjectListOpen}
        onClose={() => setIsProjectListOpen(false)}
        activeProjectId={project.id}
        onSelectProject={handleSelectProject}
        onCreateNewProject={handleCreateNewProject}
        onDeleteProject={handleDeleteProject}
      />
    </div>
  );
};

export default App;
