import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { 
  FitProject, 
  FurnitureItem, 
  RoomModel, 
  PhotoContext, 
  AppSettings, 
  UnitType 
} from './types/model';
import { 
  loadActiveProject, 
  saveProject, 
  createNewProject, 
  createSampleDemoProject 
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

export const App: React.FC = () => {
  // Canonical Project State
  const [project, setProject] = useState<FitProject>(() => loadActiveProject());

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

  // Auto-save project whenever it changes
  useEffect(() => {
    saveProject(project);
  }, [project]);

  // Pure geometric fit check evaluation (Independent of AI and rendering)
  const fitReport = useMemo(() => {
    return evaluateRoomFit(project.room, project.furniture);
  }, [project.room, project.furniture]);

  // Furniture updates
  const handleUpdateFurniture = useCallback((items: FurnitureItem[]) => {
    setProject(prev => ({
      ...prev,
      furniture: items,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleAddFurniture = useCallback((item: FurnitureItem) => {
    setProject(prev => ({
      ...prev,
      furniture: [...prev.furniture, item],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedItemId(item.id);
  }, []);

  // Room geometry updates
  const handleSaveRoom = useCallback((updatedRoom: RoomModel) => {
    setProject(prev => ({
      ...prev,
      room: updatedRoom,
      updatedAt: new Date().toISOString(),
    }));
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
    setProject(prev => ({
      ...prev,
      furniture: prev.furniture.map(f => f.id === itemId ? {
        ...f,
        isConfirmed: true,
        provenance: 'manual',
        provenanceNotes: 'Confirmed by user after review.',
      } : f),
    }));
  }, []);

  // Load new or imported project
  const handleLoadProject = useCallback((newProject: FitProject) => {
    setProject(newProject);
    setSelectedItemId(null);
  }, []);

  // Create new project
  const handleCreateNewProject = useCallback((name: string, width: number, length: number) => {
    const fresh = createNewProject(name, width, length);
    setProject(fresh);
    saveProject(fresh);
    setSelectedItemId(null);
  }, []);

  // Reset & Purge all local data
  const handlePurgeAllData = useCallback(() => {
    localStorage.clear();
    const demo = createSampleDemoProject('living');
    setProject(demo);
    saveProject(demo);
    setSelectedItemId(null);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-darkest)',
    }}>
      {/* Top Header & Navigation */}
      <Navbar
        project={project}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenCatalog={() => setIsCatalogOpen(true)}
        onOpenRoomSetup={() => setIsRoomSetupOpen(true)}
        onOpenPhotoAI={() => setIsPhotoAIOpen(true)}
        onOpenFitReport={() => setIsFitReportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProjectList={() => setIsProjectListOpen(true)}
        onUnitChange={handleUnitChange}
        fitReport={fitReport}
      />

      {/* Main View Area (2D Planner or 3D Spatial Visualizer) */}
      <main style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100vh - 62px)', overflow: 'hidden' }}>
        {activeView === '2d' ? (
          <Canvas2D
            room={project.room}
            furniture={project.furniture}
            settings={project.settings}
            fitReport={fitReport}
            onUpdateFurniture={handleUpdateFurniture}
            onSelectItem={item => setSelectedItemId(item ? item.id : null)}
            selectedItemId={selectedItemId}
          />
        ) : (
          <ThreeViewer
            room={project.room}
            furniture={project.furniture}
            fitReport={fitReport}
            displayUnit={project.settings.displayUnit}
            selectedItemId={selectedItemId}
            onSelectItem={item => setSelectedItemId(item ? item.id : null)}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <FitReportModal
        isOpen={isFitReportOpen}
        onClose={() => setIsFitReportOpen(false)}
        report={fitReport}
        furniture={project.furniture}
        onSelectItem={id => {
          setSelectedItemId(id);
          setActiveView('2d');
        }}
        onConfirmItem={handleConfirmItem}
      />

      <CatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        room={project.room}
        displayUnit={project.settings.displayUnit}
        onAddFurniture={handleAddFurniture}
      />

      <RoomModal
        isOpen={isRoomSetupOpen}
        onClose={() => setIsRoomSetupOpen(false)}
        room={project.room}
        displayUnit={project.settings.displayUnit}
        onSaveRoom={handleSaveRoom}
      />

      <PhotoUploadModal
        isOpen={isPhotoAIOpen}
        onClose={() => setIsPhotoAIOpen(false)}
        room={project.room}
        photoContext={project.photoContext}
        settings={project.settings}
        displayUnit={project.settings.displayUnit}
        onUpdatePhotoContext={handleUpdatePhotoContext}
        onAddFurniture={handleAddFurniture}
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
        onSelectProject={id => {
          // Find and load project if available
          const loaded = loadActiveProject();
          if (loaded.id === id) setProject(loaded);
        }}
        onCreateNewProject={handleCreateNewProject}
      />
    </div>
  );
};

export default App;
