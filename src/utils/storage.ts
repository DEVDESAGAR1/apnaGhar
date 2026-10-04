import type { 
  HomeProject, 
  RoomModel, 
  FloorModel, 
  PhotoContext, 
  AppSettings,
  RoomType 
} from '../types/model';
import { DEFAULT_MATERIAL_FINISH } from '../types/model';
import { FURNITURE_CATALOG, createFurnitureFromCatalog } from './catalog';

const STORAGE_KEY_CURRENT_HOME_ID = 'apnaghar_active_home_id';
const STORAGE_KEY_CURRENT_HOME = 'apnaghar_active_home';
const STORAGE_KEY_HOME_LIST = 'apnaghar_home_index';
const STORAGE_PROJECT_PREFIX = 'apnaghar_project_';
const LEGACY_STORAGE_KEY = 'fitcheck_active_project';

export const DEFAULT_SETTINGS: AppSettings = {
  displayUnit: 'cm',
  gridSnap: true,
  gridSnapSizeCm: 5,
  showClearanceZones: true,
  showDimensionsOnPlan: true,
  enableExternalAi: false,
  aiProvider: 'local-heuristic',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2-vision',
};

export const DEFAULT_EMPTY_PHOTO_CONTEXT: PhotoContext = {
  hasPhoto: false,
  privacyConsentAcknowledged: false,
};

/**
 * Versioned Migration: Migrates any legacy single-room project to a multi-room HomeProject
 */
export function migrateToHomeProject(data: any): HomeProject {
  const now = new Date().toISOString();

  // If already a valid multi-room HomeProject
  if (data && Array.isArray(data.rooms) && data.rooms.length > 0 && Array.isArray(data.floors)) {
    const activeRoomId = data.activeRoomId || data.rooms[0]?.id || 'room-1';
    const mappedRooms: RoomModel[] = data.rooms.map((r: any) => ({
      ...r,
      id: r.id || `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: r.type || 'living',
      floorId: r.floorId || data.floors[0]?.id || 'floor-ground',
      furniture: Array.isArray(r.furniture) ? r.furniture : [],
      finishes: r.finishes || { ...DEFAULT_MATERIAL_FINISH },
    }));

    const activeRoom = mappedRooms.find(r => r.id === activeRoomId) || mappedRooms[0];
    if (activeRoom && Array.isArray(data.furniture) && data.furniture.length > activeRoom.furniture.length) {
      activeRoom.furniture = data.furniture;
    }

    return {
      id: data.id || `home-${Date.now()}`,
      name: data.name || 'My Home',
      tagline: data.tagline || 'Imagine your space. Design your home.',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      floors: data.floors,
      rooms: mappedRooms,
      activeRoomId: activeRoom?.id || activeRoomId,
      activeFloorId: data.activeFloorId || data.floors[0]?.id || 'floor-ground',
      photoContext: data.photoContext || { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
      settings: data.settings || { ...DEFAULT_SETTINGS },
      room: activeRoom,
      furniture: activeRoom?.furniture || [],
    };
  }

  // Legacy single-room project structure
  const groundFloor: FloorModel = {
    id: 'floor-ground',
    name: 'Ground Floor',
    level: 0,
  };

  const legacyRoom = data?.room || {
    name: 'Living Room',
    width: 480,
    length: 560,
    height: 270,
    wallThickness: 15,
    openings: [],
  };

  const migratedRoom: RoomModel = {
    id: legacyRoom.id || 'room-primary',
    name: legacyRoom.name || 'Main Room',
    type: 'living',
    floorId: 'floor-ground',
    width: Number(legacyRoom.width) || 480,
    length: Number(legacyRoom.length) || 560,
    height: Number(legacyRoom.height) || 270,
    wallThickness: Number(legacyRoom.wallThickness) || 15,
    openings: Array.isArray(legacyRoom.openings) ? legacyRoom.openings : [],
    furniture: Array.isArray(data?.furniture) ? data.furniture : (Array.isArray(legacyRoom.furniture) ? legacyRoom.furniture : []),
    finishes: { ...DEFAULT_MATERIAL_FINISH },
  };

  return {
    id: data?.id || `home-${Date.now()}`,
    name: data?.name || 'My Home (अपना घर)',
    tagline: 'Imagine your space. Design your home.',
    createdAt: data?.createdAt || now,
    updatedAt: now,
    floors: [groundFloor],
    rooms: [migratedRoom],
    activeRoomId: migratedRoom.id,
    activeFloorId: groundFloor.id,
    photoContext: data?.photoContext || { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
    settings: data?.settings || { ...DEFAULT_SETTINGS },
    room: migratedRoom,
    furniture: migratedRoom.furniture,
  };
}

/**
 * Creates a brand new empty home project with a default room
 */
export function createNewHomeProject(
  homeName: string = 'My Home (अपना घर)',
  width: number = 480,
  length: number = 540
): HomeProject {
  const now = new Date().toISOString();
  const groundFloor: FloorModel = {
    id: `floor-${Date.now()}-0`,
    name: 'Ground Floor',
    level: 0,
  };

  const defaultRoom: RoomModel = {
    id: `room-${Date.now()}-1`,
    name: 'Living Room',
    type: 'living',
    floorId: groundFloor.id,
    width: width || 480,
    length: length || 540,
    height: 270,
    wallThickness: 15,
    openings: [
      {
        id: 'door-entry',
        type: 'door',
        wall: 'south',
        offset: 80,
        width: 90,
        height: 210,
        doorSwing: 'inward-left',
        swingClearance: 90,
      },
      {
        id: 'window-main',
        type: 'window',
        wall: 'north',
        offset: 140,
        width: 180,
        height: 150,
        sillHeight: 85,
      },
    ],
    furniture: [],
    finishes: { ...DEFAULT_MATERIAL_FINISH },
  };

  return {
    id: `home-${Date.now()}`,
    name: homeName,
    tagline: 'Imagine your space. Design your home.',
    createdAt: now,
    updatedAt: now,
    floors: [groundFloor],
    rooms: [defaultRoom],
    activeRoomId: defaultRoom.id,
    activeFloorId: groundFloor.id,
    photoContext: { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
    settings: { ...DEFAULT_SETTINGS },
    room: defaultRoom,
    furniture: defaultRoom.furniture,
  };
}

/**
 * Generates a rich sample multi-room home: "Shanti Niwas (शान्ति निवास)"
 */
export function createSampleHomeProject(): HomeProject {
  const now = new Date().toISOString();

  const floorGround: FloorModel = {
    id: 'floor-ground',
    name: 'Ground Floor',
    level: 0,
  };

  const floorUpper: FloorModel = {
    id: 'floor-upper',
    name: 'First Floor',
    level: 1,
  };

  // 1. Living Room (Ground Floor)
  const sofa = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'sofa_3seater')!, 480, 560);
  sofa.x = 240;
  sofa.y = 380;
  sofa.rotation = 0;

  const coffeeTable = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'coffee_table')!, 480, 560);
  coffeeTable.x = 240;
  coffeeTable.y = 280;

  const tvUnit = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'tv_unit')!, 480, 560);
  tvUnit.x = 240;
  tvUnit.y = 40;

  const armchair = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'armchair')!, 480, 560);
  armchair.x = 90;
  armchair.y = 330;
  armchair.rotation = 45;

  const plant = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'plant')!, 480, 560);
  plant.x = 420;
  plant.y = 50;

  const livingRoom: RoomModel = {
    id: 'room-living',
    name: 'Living & Lounge',
    type: 'living',
    floorId: floorGround.id,
    width: 480,
    length: 560,
    height: 270,
    wallThickness: 15,
    openings: [
      {
        id: 'door-front',
        type: 'door',
        wall: 'south',
        offset: 80,
        width: 90,
        height: 210,
        doorSwing: 'inward-left',
        swingClearance: 90,
      },
      {
        id: 'window-patio',
        type: 'window',
        wall: 'north',
        offset: 140,
        width: 200,
        height: 160,
        sillHeight: 80,
      },
    ],
    furniture: [sofa, coffeeTable, tvUnit, armchair, plant],
    finishes: {
      wallColor: '#F5F2EB', // Warm Alabaster
      wallFinish: 'limewash',
      floorType: 'hardwood_oak',
      floorColor: '#C49A6C',
    },
  };

  // 2. Dining & Kitchenette (Ground Floor)
  const diningTable = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'dining_table')!, 380, 420);
  diningTable.x = 190;
  diningTable.y = 210;

  const diningPlant = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'plant')!, 380, 420);
  diningPlant.x = 50;
  diningPlant.y = 50;

  const diningRoom: RoomModel = {
    id: 'room-dining',
    name: 'Dining & Kitchenette',
    type: 'dining',
    floorId: floorGround.id,
    width: 380,
    length: 420,
    height: 270,
    wallThickness: 15,
    openings: [
      {
        id: 'door-patio',
        type: 'door',
        wall: 'south',
        offset: 60,
        width: 85,
        height: 210,
        doorSwing: 'inward-right',
        swingClearance: 85,
      },
    ],
    furniture: [diningTable, diningPlant],
    finishes: {
      wallColor: '#E6E2D8', // Limewash Stone
      wallFinish: 'matte',
      floorType: 'limestone_tile',
      floorColor: '#D8D2C4',
    },
  };

  // 3. Master Bedroom (First Floor)
  const bed = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'bed_queen')!, 360, 440);
  bed.x = 180;
  bed.y = 140;

  const nightstandL = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'nightstand')!, 360, 440);
  nightstandL.x = 55;
  nightstandL.y = 60;

  const nightstandR = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'nightstand')!, 360, 440);
  nightstandR.x = 305;
  nightstandR.y = 60;

  const dresser = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'dresser')!, 360, 440);
  dresser.x = 180;
  dresser.y = 390;
  dresser.rotation = 180;

  const bedroom: RoomModel = {
    id: 'room-master-bed',
    name: 'Master Bedroom',
    type: 'bedroom',
    floorId: floorUpper.id,
    width: 360,
    length: 440,
    height: 260,
    wallThickness: 15,
    openings: [
      {
        id: 'door-bedroom',
        type: 'door',
        wall: 'west',
        offset: 60,
        width: 85,
        height: 205,
        doorSwing: 'inward-right',
        swingClearance: 85,
      },
      {
        id: 'window-bed',
        type: 'window',
        wall: 'north',
        offset: 100,
        width: 160,
        height: 140,
        sillHeight: 90,
      },
    ],
    furniture: [bed, nightstandL, nightstandR, dresser],
    finishes: {
      wallColor: '#F2EDE4', // Soft Linen
      wallFinish: 'matte',
      floorType: 'herringbone_parquet',
      floorColor: '#B88B58',
    },
  };

  // 4. Home Studio & Office (First Floor)
  const desk = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'desk')!, 320, 360);
  desk.x = 160;
  desk.y = 80;

  const bookcase = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'bookcase')!, 320, 360);
  bookcase.x = 265;
  bookcase.y = 25;

  const officeChair = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'armchair')!, 320, 360);
  officeChair.x = 160;
  officeChair.y = 260;

  const studio: RoomModel = {
    id: 'room-studio',
    name: 'Home Studio & Office',
    type: 'office',
    floorId: floorUpper.id,
    width: 320,
    length: 360,
    height: 260,
    wallThickness: 15,
    openings: [
      {
        id: 'door-office',
        type: 'door',
        wall: 'south',
        offset: 50,
        width: 80,
        height: 200,
        doorSwing: 'inward-left',
        swingClearance: 80,
      },
      {
        id: 'window-office',
        type: 'window',
        wall: 'north',
        offset: 90,
        width: 140,
        height: 130,
        sillHeight: 95,
      },
    ],
    furniture: [desk, bookcase, officeChair],
    finishes: {
      wallColor: '#EBEFEB', // Muted Sage wash
      wallFinish: 'matte',
      floorType: 'hardwood_walnut',
      floorColor: '#6D4C3D',
    },
  };

  return {
    id: `home-sample-${Date.now()}`,
    name: 'Shanti Niwas (शान्ति निवास)',
    tagline: 'Imagine your space. Design your home.',
    createdAt: now,
    updatedAt: now,
    floors: [floorGround, floorUpper],
    rooms: [livingRoom, diningRoom, bedroom, studio],
    activeRoomId: livingRoom.id,
    activeFloorId: floorGround.id,
    photoContext: { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
    settings: { ...DEFAULT_SETTINGS },
    isSample: true,
    room: livingRoom,
    furniture: livingRoom.furniture,
  };
}

/**
 * Add a new room to a home project
 */
export function addRoomToHome(
  project: HomeProject,
  name: string,
  type: RoomType,
  floorId: string,
  width: number = 400,
  length: number = 480
): HomeProject {
  const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newRoom: RoomModel = {
    id: newRoomId,
    name,
    type,
    floorId,
    width: Math.max(100, width),
    length: Math.max(100, length),
    height: 260,
    wallThickness: 15,
    openings: [
      {
        id: `door-${Date.now()}`,
        type: 'door',
        wall: 'south',
        offset: 60,
        width: 85,
        height: 205,
        doorSwing: 'inward-left',
        swingClearance: 85,
      },
    ],
    furniture: [],
    finishes: { ...DEFAULT_MATERIAL_FINISH },
  };

  return {
    ...project,
    rooms: [...project.rooms, newRoom],
    activeRoomId: newRoom.id,
    activeFloorId: floorId,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Delete a room from home project safely (prevents deleting last room)
 */
export function deleteRoomFromHome(project: HomeProject, roomId: string): HomeProject {
  if (project.rooms.length <= 1) {
    return project; // Never delete the only remaining room
  }

  const updatedRooms = project.rooms.filter(r => r.id !== roomId);
  const nextActiveRoom = updatedRooms.find(r => r.id === project.activeRoomId) || updatedRooms[0];

  return {
    ...project,
    rooms: updatedRooms,
    activeRoomId: nextActiveRoom.id,
    activeFloorId: nextActiveRoom.floorId,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Duplicate a room with its geometry, openings, and furniture
 */
export function duplicateRoomInHome(project: HomeProject, roomId: string): HomeProject {
  const sourceRoom = project.rooms.find(r => r.id === roomId);
  if (!sourceRoom) return project;

  const duplicatedId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const duplicatedRoom: RoomModel = {
    ...sourceRoom,
    id: duplicatedId,
    name: `${sourceRoom.name} (Copy)`,
    openings: sourceRoom.openings.map(o => ({ ...o, id: `opening-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` })),
    furniture: sourceRoom.furniture.map(f => ({ ...f, id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` })),
    finishes: { ...sourceRoom.finishes },
  };

  return {
    ...project,
    rooms: [...project.rooms, duplicatedRoom],
    activeRoomId: duplicatedRoom.id,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Save project to browser local storage with per-project isolation
 */
export function saveProject(project: HomeProject): void {
  try {
    project.updatedAt = new Date().toISOString();

    // Canonical source of truth is project.rooms
    // Update active room backward-compat pointers cleanly without mutating other rooms
    const active = project.rooms.find(r => r.id === project.activeRoomId) || project.rooms[0];
    if (active) {
      project.room = active;
      project.furniture = active.furniture || [];
    }

    const serialized = JSON.stringify(project);

    // 1. Save to individual isolated project key
    localStorage.setItem(`${STORAGE_PROJECT_PREFIX}${project.id}`, serialized);

    // 2. Track current active home project ID
    localStorage.setItem(STORAGE_KEY_CURRENT_HOME_ID, project.id);

    // 3. Keep current home & legacy keys updated for backward compatibility
    localStorage.setItem(STORAGE_KEY_CURRENT_HOME, serialized);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);

    // 4. Update project directory index
    const indexStr = localStorage.getItem(STORAGE_KEY_HOME_LIST);
    let index: { id: string; name: string; updatedAt: string; roomCount: number; itemCount: number; isSample?: boolean }[] = [];
    if (indexStr) {
      try {
        index = JSON.parse(indexStr);
      } catch {
        index = [];
      }
    }

    const totalItems = project.rooms.reduce((acc, r) => acc + (r.furniture?.length || 0), 0);
    const existingIdx = index.findIndex(p => p.id === project.id);
    const entry = {
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      roomCount: project.rooms.length,
      itemCount: totalItems,
      isSample: Boolean(project.isSample),
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.unshift(entry);
    }

    localStorage.setItem(STORAGE_KEY_HOME_LIST, JSON.stringify(index));
  } catch (err) {
    console.error('Failed to save project to localStorage', err);
  }
}

/**
 * Load project by its unique ID
 */
export function loadProjectById(id: string): HomeProject | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PROJECT_PREFIX}${id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateToHomeProject(parsed);
      return migrated;
    }
  } catch (err) {
    console.warn(`Could not load project with id ${id}`, err);
  }
  return null;
}

/**
 * Delete a project by ID from storage and index
 */
export function deleteProject(id: string): HomeProject {
  try {
    localStorage.removeItem(`${STORAGE_PROJECT_PREFIX}${id}`);
    const indexStr = localStorage.getItem(STORAGE_KEY_HOME_LIST);
    let nextActiveId: string | null = null;
    if (indexStr) {
      const index = JSON.parse(indexStr).filter((p: any) => p.id !== id);
      localStorage.setItem(STORAGE_KEY_HOME_LIST, JSON.stringify(index));
      if (index.length > 0) {
        nextActiveId = index[0].id;
      }
    }

    if (nextActiveId) {
      const nextActive = loadProjectById(nextActiveId);
      if (nextActive) {
        saveProject(nextActive);
        return nextActive;
      }
    }
  } catch (err) {
    console.error('Failed to delete project', err);
  }

  const fresh = createSampleHomeProject();
  saveProject(fresh);
  return fresh;
}

/**
 * Load active project from localStorage or return default sample home
 */
export function loadActiveProject(): HomeProject {
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_CURRENT_HOME_ID);
    if (activeId) {
      const proj = loadProjectById(activeId);
      if (proj) return proj;
    }

    const serialized = localStorage.getItem(STORAGE_KEY_CURRENT_HOME) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      const migrated = migrateToHomeProject(parsed);
      saveProject(migrated);
      return migrated;
    }
  } catch (err) {
    console.warn('Could not parse stored project, starting with sample home.', err);
  }

  const demo = createSampleHomeProject();
  saveProject(demo);
  return demo;
}

/**
 * Rename a room inside a home project
 */
export function renameRoomInHome(project: HomeProject, roomId: string, newName: string): HomeProject {
  const trimmed = newName.trim();
  if (!trimmed) return project;
  const updatedRooms = project.rooms.map(r => r.id === roomId ? { ...r, name: trimmed } : r);
  const updated: HomeProject = {
    ...project,
    rooms: updatedRooms,
    updatedAt: new Date().toISOString(),
  };
  saveProject(updated);
  return updated;
}

/**
 * Reorder rooms in a home project
 */
export function reorderRoomsInHome(project: HomeProject, orderedRoomIds: string[]): HomeProject {
  const roomMap = new Map(project.rooms.map(r => [r.id, r]));
  const reordered: RoomModel[] = [];
  for (const id of orderedRoomIds) {
    const r = roomMap.get(id);
    if (r) {
      reordered.push(r);
      roomMap.delete(id);
    }
  }
  for (const remaining of roomMap.values()) {
    reordered.push(remaining);
  }
  const updated: HomeProject = {
    ...project,
    rooms: reordered,
    updatedAt: new Date().toISOString(),
  };
  saveProject(updated);
  return updated;
}

/**
 * Apply whole-home styling configuration to rooms
 */
export function applyWholeHomeStyling(
  project: HomeProject,
  config: import('../types/model').WholeHomeStyleConfig,
  scopeOrTargets: 'all' | 'selected' | string[] | undefined = 'all',
  targetRoomIdsOrPreserve?: string[] | boolean,
  preserveCustomized?: boolean
): HomeProject {
  let scope: 'all' | 'selected' = 'all';
  let targetRoomIds: string[] | undefined;
  let preserve = Boolean(preserveCustomized);

  if (Array.isArray(scopeOrTargets)) {
    scope = 'selected';
    targetRoomIds = scopeOrTargets;
    if (typeof targetRoomIdsOrPreserve === 'boolean') {
      preserve = targetRoomIdsOrPreserve;
    }
  } else if (scopeOrTargets === 'selected') {
    scope = 'selected';
    if (Array.isArray(targetRoomIdsOrPreserve)) {
      targetRoomIds = targetRoomIdsOrPreserve;
    }
  } else {
    scope = 'all';
    if (typeof targetRoomIdsOrPreserve === 'boolean') {
      preserve = targetRoomIdsOrPreserve;
    } else if (Array.isArray(targetRoomIdsOrPreserve)) {
      targetRoomIds = targetRoomIdsOrPreserve;
      scope = 'selected';
    }
  }

  const targets = new Set(scope === 'all' ? project.rooms.map(r => r.id) : (targetRoomIds || []));
  const floorType = config.floorType || config.sharedFloorType;
  const floorColor = config.floorColor || config.sharedFloorColor;
  const wallFinish = config.wallFinish || config.sharedWallFinish;
  const paletteId = config.paletteId || config.sharedPaletteId;
  const styleId = config.preferredStyleId || config.preferredStyle;

  const updatedRooms = project.rooms.map(room => {
    if (!targets.has(room.id)) return room;
    const isCustomized = (room as any).isCustomized || (room.finishes as any)?.isCustomized;
    if (preserve && isCustomized) {
      return room;
    }
    return {
      ...room,
      finishes: {
        ...room.finishes,
        wallColor: config.primaryWallColor || room.finishes.wallColor,
        accentWallColor: config.accentWallColor || room.finishes.accentWallColor,
        trimColor: config.trimColor || room.finishes.trimColor,
        ceilingColor: config.ceilingColor || room.finishes.ceilingColor,
        wallFinish: wallFinish || room.finishes.wallFinish,
        floorType: floorType || room.finishes.floorType,
        floorColor: floorColor || room.finishes.floorColor,
        paletteId: paletteId || room.finishes.paletteId,
        styleId: styleId || room.finishes.styleId,
      },
    };
  });

  const updated: HomeProject = {
    ...project,
    rooms: updatedRooms,
    wholeHomeStyling: {
      ...project.wholeHomeStyling,
      ...config,
    },
    updatedAt: new Date().toISOString(),
  };
  saveProject(updated);
  return updated;
}

/**
 * List all saved project summaries
 */
export function listSavedProjects(): { id: string; name: string; updatedAt: string; roomCount?: number; itemCount: number; isSample?: boolean }[] {
  try {
    const indexStr = localStorage.getItem(STORAGE_KEY_HOME_LIST);
    if (indexStr) return JSON.parse(indexStr);
  } catch {
    // fallback
  }
  return [];
}

/**
 * Export project JSON with PRIVACY PRESERVATION BY DEFAULT
 * Photos are stripped unless user explicitly requests inclusion
 */
export function exportProjectJson(project: HomeProject, includePrivatePhoto: boolean = false): string {
  const active = project.rooms.find(r => r.id === project.activeRoomId) || project.rooms[0];
  const exportPayload: HomeProject = {
    ...project,
    room: active || project.room,
    furniture: active?.furniture || project.furniture || [],
    photoContext: {
      ...project.photoContext,
      // PRIVACY: strip raw image bytes by default
      photoDataUrl: includePrivatePhoto ? project.photoContext.photoDataUrl : undefined,
    },
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Validates and imports project JSON (supporting both HomeProject and legacy FitProject)
 */
export function importProjectJson(jsonStr: string): HomeProject {
  const parsed = JSON.parse(jsonStr);

  // Validate either multi-room or single-room
  const hasRooms = Array.isArray(parsed.rooms) && parsed.rooms.length > 0;
  const hasSingleRoom = parsed.room && typeof parsed.room.width === 'number';

  if (!hasRooms && !hasSingleRoom) {
    throw new Error('Invalid ApnaGhar project file: Missing room dimensions.');
  }

  const migrated = migrateToHomeProject(parsed);
  migrated.id = `imported-${Date.now()}`;
  migrated.updatedAt = new Date().toISOString();

  return migrated;
}

/**
 * Purge private photo from project and persistent storage
 */
export function purgePrivatePhoto(project: HomeProject): HomeProject {
  const active = project.rooms.find(r => r.id === project.activeRoomId) || project.rooms[0];
  const updated: HomeProject = {
    ...project,
    room: active || project.room,
    furniture: active?.furniture || project.furniture || [],
    photoContext: {
      hasPhoto: false,
      photoDataUrl: undefined,
      photoName: undefined,
      uploadedAt: undefined,
      imageDimensions: undefined,
      detectedSuggestions: undefined,
      privacyConsentAcknowledged: false,
    },
  };
  saveProject(updated);
  return updated;
}

// Backward-compatibility wrapper for single-room demo creation
export function createSampleDemoProject(_template?: string): HomeProject {
  return createSampleHomeProject();
}

export function createNewProject(name: string = 'My Home', width?: number, length?: number): HomeProject {
  return createNewHomeProject(name, width, length);
}
