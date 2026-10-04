import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createNewHomeProject, 
  createSampleHomeProject, 
  addRoomToHome, 
  deleteRoomFromHome, 
  duplicateRoomInHome,
  migrateToHomeProject,
  saveProject,
  loadActiveProject,
  exportProjectJson,
  importProjectJson
} from '../utils/storage';
import { evaluateRoomFit } from '../utils/fitEngine';
import type { HomeProject, DesignVariant, RoomMaterialFinish } from '../types/model';

// Mock localStorage for test environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
  key: (idx: number) => Object.keys(mockStorage)[idx] || null,
  length: 0,
};

describe('ApnaGhar (अपना घर) — Whole-Home Project & Multi-Room Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates an architectural multi-room home with default ground floor and room', () => {
    const home = createNewHomeProject('Ashiyana (आशियाना)', 450, 520);
    expect(home.name).toBe('Ashiyana (आशियाना)');
    expect(home.floors).toHaveLength(1);
    expect(home.floors[0].name).toBe('Ground Floor');
    expect(home.rooms).toHaveLength(1);
    expect(home.rooms[0].width).toBe(450);
    expect(home.rooms[0].length).toBe(520);
    expect(home.activeRoomId).toBe(home.rooms[0].id);
  });

  it('generates rich sample home Shanti Niwas with 4 distinct rooms across 2 floors', () => {
    const home = createSampleHomeProject();
    expect(home.name).toContain('Shanti Niwas');
    expect(home.floors).toHaveLength(2); // Ground and First floor
    expect(home.rooms).toHaveLength(4); // Living, Dining, Bedroom, Studio

    const living = home.rooms.find(r => r.id === 'room-living');
    const dining = home.rooms.find(r => r.id === 'room-dining');
    const bedroom = home.rooms.find(r => r.id === 'room-master-bed');
    const studio = home.rooms.find(r => r.id === 'room-studio');

    expect(living).toBeDefined();
    expect(dining).toBeDefined();
    expect(bedroom).toBeDefined();
    expect(studio).toBeDefined();

    // Verify rooms are associated with appropriate floors
    expect(living?.floorId).toBe('floor-ground');
    expect(dining?.floorId).toBe('floor-ground');
    expect(bedroom?.floorId).toBe('floor-upper');
    expect(studio?.floorId).toBe('floor-upper');

    // Verify each room has curated furniture
    expect((living?.furniture || []).length).toBeGreaterThanOrEqual(4);
    expect((bedroom?.furniture || []).length).toBeGreaterThanOrEqual(3);
  });

  it('adds new rooms to specific floors without corrupting existing rooms', () => {
    let home = createNewHomeProject('Family House');
    const groundFloorId = home.floors[0].id;

    home = addRoomToHome(home, 'Master Suite', 'bedroom', groundFloorId, 400, 480);
    expect(home.rooms).toHaveLength(2);
    expect(home.activeRoomId).toBe(home.rooms[1].id);
    expect(home.rooms[1].name).toBe('Master Suite');
    expect(home.rooms[1].type).toBe('bedroom');
    expect(home.rooms[1].width).toBe(400);
    expect(home.rooms[1].length).toBe(480);
    expect(home.rooms[0].name).toBe('Living Room'); // Preserved untouched
  });

  it('duplicates rooms preserving geometry, openings, and furniture while generating unique IDs', () => {
    const sample = createSampleHomeProject();
    const living = sample.rooms.find(r => r.id === 'room-living')!;
    const originalCount = sample.rooms.length;
    const originalFurnitureCount = living.furniture?.length || 0;

    const updated = duplicateRoomInHome(sample, living.id);
    expect(updated.rooms).toHaveLength(originalCount + 1);

    const duplicated = updated.rooms.find(r => r.id === updated.activeRoomId)!;
    expect(duplicated.name).toBe(`${living.name} (Copy)`);
    expect(duplicated.width).toBe(living.width);
    expect(duplicated.length).toBe(living.length);
    expect(duplicated.furniture?.length).toBe(originalFurnitureCount);
    expect(duplicated.id).not.toBe(living.id);

    // Verify cloned furniture items have distinct unique IDs
    const origIds = new Set(living.furniture?.map(f => f.id));
    for (const f of duplicated.furniture || []) {
      expect(origIds.has(f.id)).toBe(false);
    }
  });

  it('safely deletes rooms and prevents deletion of the sole remaining room', () => {
    let home = createNewHomeProject('Minimal Home');
    const firstRoomId = home.rooms[0].id;

    // Attempting to delete the only room should return untouched home
    const attemptedDelete = deleteRoomFromHome(home, firstRoomId);
    expect(attemptedDelete.rooms).toHaveLength(1);

    // Add a second room, then delete the first
    home = addRoomToHome(home, 'Kitchen', 'kitchen', home.floors[0].id, 300, 350);
    expect(home.rooms).toHaveLength(2);

    home = deleteRoomFromHome(home, firstRoomId);
    expect(home.rooms).toHaveLength(1);
    expect(home.rooms[0].name).toBe('Kitchen');
    expect(home.activeRoomId).toBe(home.rooms[0].id);
  });

  it('migrates legacy single-room project format to multi-room HomeProject seamlessly', () => {
    const legacyProject = {
      id: 'legacy-proj-101',
      name: 'Old Single Room Plan',
      room: {
        name: 'Single Den',
        width: 380,
        length: 420,
        height: 260,
        wallThickness: 15,
        openings: [],
      },
      furniture: [
        {
          id: 'item-leg-1',
          name: 'Classic Desk',
          category: 'desk',
          width: 120,
          depth: 60,
          height: 75,
          x: 100,
          y: 100,
          z: 0,
          rotation: 0,
          color: '#8b5cf6',
          modelType: 'desk',
          clearances: {},
          provenance: 'catalog',
          isConfirmed: true,
        },
      ],
      photoContext: { hasPhoto: false },
      settings: { displayUnit: 'cm', snapToGrid: true, showClearances: true },
    };

    const migrated = migrateToHomeProject(legacyProject);
    expect(migrated.rooms).toHaveLength(1);
    expect(migrated.floors).toHaveLength(1);
    expect(migrated.rooms[0].name).toBe('Single Den');
    expect(migrated.rooms[0].width).toBe(380);
    expect(migrated.rooms[0].length).toBe(420);
    expect(migrated.rooms[0].furniture).toHaveLength(1);
    expect(migrated.rooms[0].furniture[0].name).toBe('Classic Desk');
    expect(migrated.room).toBeDefined();
    expect(migrated.furniture).toHaveLength(1);
  });
});

describe('ApnaGhar (अपना घर) — Interior Styling & Design Variants Suite', () => {
  it('persists wall finishes, textures, and floor materials per room', () => {
    const home = createSampleHomeProject();
    const living = home.rooms.find(r => r.id === 'room-living')!;

    const newFinishes: RoomMaterialFinish = {
      wallColor: '#B86B53', // Terracotta Clay
      wallFinish: 'limewash',
      floorType: 'herringbone_parquet',
      floorColor: '#B88B58',
    };

    living.finishes = newFinishes;
    saveProject(home);

    const reloaded = loadActiveProject();
    const reloadedLiving = reloaded.rooms.find(r => r.id === 'room-living')!;
    expect(reloadedLiving.finishes?.wallColor).toBe('#B86B53');
    expect(reloadedLiving.finishes?.wallFinish).toBe('limewash');
    expect(reloadedLiving.finishes?.floorType).toBe('herringbone_parquet');
  });

  it('creates and manages design variants for alternative spatial proposals', () => {
    const home = createSampleHomeProject();
    const living = home.rooms.find(r => r.id === 'room-living')!;

    const variantB: DesignVariant = {
      id: 'variant-opt-b',
      name: 'Option B — Minimalist Open Flow',
      createdAt: new Date().toISOString(),
      finishes: {
        wallColor: '#F5F2EB',
        wallFinish: 'matte',
        floorType: 'polished_concrete',
        floorColor: '#A8ACB3',
      },
      furniture: (living.furniture || []).slice(0, 2), // stripped-down arrangement
    };

    living.variants = [variantB];
    expect(living.variants).toHaveLength(1);
    expect(living.variants[0].name).toBe('Option B — Minimalist Open Flow');
    expect(living.variants[0].furniture).toHaveLength(2);
    expect(living.variants[0].finishes.floorType).toBe('polished_concrete');
  });

  it('evaluates spatial fit independently per room across the entire home', () => {
    const home = createSampleHomeProject();

    const reports = home.rooms.map(room => ({
      roomId: room.id,
      name: room.name,
      report: evaluateRoomFit(room, room.furniture || []),
    }));

    expect(reports).toHaveLength(4);
    for (const r of reports) {
      expect(['PASS', 'FAIL', 'REVIEW', 'NOT_CHECKED']).toContain(r.report.overallStatus);
      expect(Array.isArray(r.report.checks)).toBe(true);
      const totalChecks = r.report.summary.passCount + r.report.summary.failCount + r.report.summary.reviewCount + r.report.summary.notCheckedCount;
      expect(totalChecks).toBe(r.report.checks.length);
    }
  });
});
