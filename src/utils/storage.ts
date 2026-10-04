import type { FitProject, RoomModel, PhotoContext, AppSettings } from '../types/model';
import { FURNITURE_CATALOG, createFurnitureFromCatalog } from './catalog';

const STORAGE_KEY_CURRENT_PROJECT = 'fitcheck_active_project';
const STORAGE_KEY_PROJECT_LIST = 'fitcheck_project_index';

export const DEFAULT_SETTINGS: AppSettings = {
  displayUnit: 'cm',
  gridSnap: true,
  gridSnapSizeCm: 5,
  showClearanceZones: true,
  showDimensionsOnPlan: true,
  enableExternalAi: false,
  aiProvider: 'local-heuristic',
};

export const DEFAULT_EMPTY_PHOTO_CONTEXT: PhotoContext = {
  hasPhoto: false,
  privacyConsentAcknowledged: false,
};

/**
 * Creates a brand new empty project
 */
export function createNewProject(name: string = 'My Living Room', width: number = 420, length: number = 500): FitProject {
  const now = new Date().toISOString();
  const id = `project-${Date.now()}`;

  const defaultRoom: RoomModel = {
    name,
    width,
    length,
    height: 260,
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
        offset: 120,
        width: 180,
        height: 140,
        sillHeight: 90,
      },
    ],
  };

  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    room: defaultRoom,
    furniture: [],
    photoContext: { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * Generates sample preloaded demo projects for immediate demonstration
 */
export function createSampleDemoProject(template: 'living' | 'bedroom' | 'office' = 'living'): FitProject {
  const now = new Date().toISOString();

  if (template === 'bedroom') {
    const room: RoomModel = {
      name: 'Master Bedroom',
      width: 340,
      length: 420,
      height: 250,
      wallThickness: 15,
      openings: [
        {
          id: 'door-bed',
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
          width: 140,
          height: 130,
          sillHeight: 90,
        },
      ],
    };

    const bed = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'bed_queen')!, room.width, room.length);
    bed.x = 170;
    bed.y = 130;
    bed.rotation = 0;

    const nightstand = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'nightstand')!, room.width, room.length);
    nightstand.x = 60;
    nightstand.y = 50;

    const desk = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'desk_compact')!, room.width, room.length);
    desk.x = 270;
    desk.y = 350;
    desk.rotation = 180;

    return {
      id: `demo-bedroom-${Date.now()}`,
      name: 'Sample Master Bedroom',
      createdAt: now,
      updatedAt: now,
      room,
      furniture: [bed, nightstand, desk],
      photoContext: { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  if (template === 'office') {
    const room: RoomModel = {
      name: 'Home Studio & Office',
      width: 320,
      length: 360,
      height: 260,
      wallThickness: 15,
      openings: [
        {
          id: 'door-office',
          type: 'door',
          wall: 'south',
          offset: 60,
          width: 80,
          height: 200,
          doorSwing: 'inward-left',
          swingClearance: 80,
        },
      ],
    };

    const desk = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'desk')!, room.width, room.length);
    desk.x = 160;
    desk.y = 80;

    const bookcase = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'bookcase')!, room.width, room.length);
    bookcase.x = 260;
    bookcase.y = 20;

    const plant = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'plant')!, room.width, room.length);
    plant.x = 45;
    plant.y = 45;

    return {
      id: `demo-office-${Date.now()}`,
      name: 'Sample Home Office',
      createdAt: now,
      updatedAt: now,
      room,
      furniture: [desk, bookcase, plant],
      photoContext: { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  // Default: Spacious Living Room Demo
  const room: RoomModel = {
    name: 'Scandi Living Room',
    width: 480,
    length: 560,
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
        id: 'window-patio',
        type: 'window',
        wall: 'north',
        offset: 140,
        width: 200,
        height: 160,
        sillHeight: 80,
      },
    ],
  };

  const sofa = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'sofa_3seater')!, room.width, room.length);
  sofa.x = 240;
  sofa.y = 380;
  sofa.rotation = 0;

  const coffeeTable = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'coffee_table')!, room.width, room.length);
  coffeeTable.x = 240;
  coffeeTable.y = 280;

  const tvUnit = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'tv_unit')!, room.width, room.length);
  tvUnit.x = 240;
  tvUnit.y = 40;

  const armchair = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'armchair')!, room.width, room.length);
  armchair.x = 90;
  armchair.y = 330;
  armchair.rotation = 45;

  const plant = createFurnitureFromCatalog(FURNITURE_CATALOG.find(i => i.modelType === 'plant')!, room.width, room.length);
  plant.x = 420;
  plant.y = 50;

  return {
    id: `demo-living-${Date.now()}`,
    name: 'Sample Scandi Living Room',
    createdAt: now,
    updatedAt: now,
    room,
    furniture: [sofa, coffeeTable, tvUnit, armchair, plant],
    photoContext: { ...DEFAULT_EMPTY_PHOTO_CONTEXT },
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * Save project to browser local storage
 */
export function saveProject(project: FitProject): void {
  try {
    project.updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(project);
    localStorage.setItem(STORAGE_KEY_CURRENT_PROJECT, serialized);

    // Update project directory index
    const indexStr = localStorage.getItem(STORAGE_KEY_PROJECT_LIST);
    let index: { id: string; name: string; updatedAt: string; itemCount: number }[] = [];
    if (indexStr) {
      try {
        index = JSON.parse(indexStr);
      } catch {
        index = [];
      }
    }

    const existingIdx = index.findIndex(p => p.id === project.id);
    const entry = {
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      itemCount: project.furniture.length,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.unshift(entry);
    }

    localStorage.setItem(STORAGE_KEY_PROJECT_LIST, JSON.stringify(index));
  } catch (err) {
    console.error('Failed to save project to localStorage', err);
  }
}

/**
 * Load active project from localStorage or return default sample demo
 */
export function loadActiveProject(): FitProject {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY_CURRENT_PROJECT);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      if (parsed && parsed.room && Array.isArray(parsed.furniture)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not parse stored project, starting with demo project.', err);
  }

  const demo = createSampleDemoProject('living');
  saveProject(demo);
  return demo;
}

/**
 * List all saved project summaries
 */
export function listSavedProjects(): { id: string; name: string; updatedAt: string; itemCount: number }[] {
  try {
    const indexStr = localStorage.getItem(STORAGE_KEY_PROJECT_LIST);
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
export function exportProjectJson(project: FitProject, includePrivatePhoto: boolean = false): string {
  const exportPayload: FitProject = {
    ...project,
    photoContext: {
      ...project.photoContext,
      // PRIVACY: strip raw image bytes by default
      photoDataUrl: includePrivatePhoto ? project.photoContext.photoDataUrl : undefined,
    },
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Validates and imports project JSON
 */
export function importProjectJson(jsonStr: string): FitProject {
  const parsed = JSON.parse(jsonStr);

  if (!parsed.room || typeof parsed.room.width !== 'number' || typeof parsed.room.length !== 'number') {
    throw new Error('Invalid FitCheck project file: Missing room dimensions.');
  }

  if (!Array.isArray(parsed.furniture)) {
    parsed.furniture = [];
  }

  // Ensure unique ID and update timestamps
  parsed.id = `imported-${Date.now()}`;
  parsed.updatedAt = new Date().toISOString();
  if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
  if (!parsed.photoContext) parsed.photoContext = { ...DEFAULT_EMPTY_PHOTO_CONTEXT };

  return parsed;
}

/**
 * Purge private photo from project and persistent storage
 */
export function purgePrivatePhoto(project: FitProject): FitProject {
  const updated: FitProject = {
    ...project,
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
