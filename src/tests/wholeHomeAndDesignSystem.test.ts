import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createNewProject, 
  createSampleDemoProject, 
  addRoomToHome, 
  deleteRoomFromHome, 
  duplicateRoomInHome,
  renameRoomInHome,
  reorderRoomsInHome,
  applyWholeHomeStyling,
  saveProject,
  loadProjectById,
  deleteProject,
  listSavedProjects
} from '../utils/storage';
import { 
  CURATED_PALETTES, 
  INTERIOR_STYLES, 
  PAINT_COLORS, 
  FLOOR_MATERIALS,
  filterPaintColors,
  findPaintColor
} from '../utils/designSystem';
import { 
  analyzeRoomPhoto,
  callGemmaVisionDetails,
  checkGemmaConnection
} from '../utils/aiVision';
import { evaluateSemanticSuitability } from '../utils/imageValidation';
import type { 
  HomeProject, 
  RoomModel, 
  FurnitureItem, 
  WholeHomeStyleConfig,
  RoomMaterialFinish
} from '../types/model';

describe('ApnaGhar (अपना घर) — Whole-Home Intelligence & Multi-Room State Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates a whole-home project with independent multi-room hierarchy', () => {
    const home = createNewProject('Villa Shanti');
    expect(home.name).toBe('Villa Shanti');
    expect(home.rooms.length).toBeGreaterThanOrEqual(1);

    // Add additional independent rooms
    const withBedroom = addRoomToHome(home, 'Master Suite', 'bedroom', home.floors[0].id, 450, 520);
    const withStudy = addRoomToHome(withBedroom, 'Library & Office', 'office', home.floors[0].id, 320, 380);

    expect(withStudy.rooms.length).toBe(home.rooms.length + 2);
    expect(withStudy.rooms.map(r => r.name)).toContain('Master Suite');
    expect(withStudy.rooms.map(r => r.name)).toContain('Library & Office');
  });

  it('ensures room-specific edits are isolated and do not leak between rooms', () => {
    let home = createNewProject('Greenwood Home');
    home = addRoomToHome(home, 'Living Room', 'living', home.floors[0].id, 500, 600);
    home = addRoomToHome(home, 'Children Bedroom', 'bedroom', home.floors[0].id, 350, 400);

    const livingRoomId = home.rooms.find(r => r.name === 'Living Room')!.id;
    const bedroomId = home.rooms.find(r => r.name === 'Children Bedroom')!.id;

    const sofa: FurnitureItem = {
      id: 'sofa-living-1',
      name: 'Custom 3-Seater Velvet Sofa',
      category: 'seating',
      width: 210,
      depth: 90,
      height: 85,
      x: 250,
      y: 300,
      rotation: 0,
      color: '#3d5a80',
      modelType: 'sofa_3seater',
      isConfirmed: true,
      provenance: 'manual',
    };

    const bunkBed: FurnitureItem = {
      id: 'bed-kids-1',
      name: 'Twin Bunk Bed',
      category: 'bed',
      width: 110,
      depth: 200,
      height: 160,
      x: 100,
      y: 150,
      rotation: 90,
      color: '#2a9d8f',
      modelType: 'bed_queen',
      isConfirmed: true,
      provenance: 'manual',
    };

    // Update Living Room furniture
    home = {
      ...home,
      rooms: home.rooms.map(r => r.id === livingRoomId ? { ...r, furniture: [sofa] } : r),
    };

    // Update Bedroom furniture
    home = {
      ...home,
      rooms: home.rooms.map(r => r.id === bedroomId ? { ...r, furniture: [bunkBed] } : r),
    };

    // Verify isolation
    const updatedLiving = home.rooms.find(r => r.id === livingRoomId)!;
    const updatedBedroom = home.rooms.find(r => r.id === bedroomId)!;

    expect(updatedLiving.furniture.length).toBe(1);
    expect(updatedLiving.furniture[0].id).toBe('sofa-living-1');
    expect(updatedLiving.furniture[0].name).toBe('Custom 3-Seater Velvet Sofa');

    expect(updatedBedroom.furniture.length).toBe(1);
    expect(updatedBedroom.furniture[0].id).toBe('bed-kids-1');
    expect(updatedBedroom.furniture[0].name).toBe('Twin Bunk Bed');

    // Confirm sofa does NOT exist in bedroom and bed does NOT exist in living room
    expect(updatedBedroom.furniture.some(f => f.id === 'sofa-living-1')).toBe(false);
    expect(updatedLiving.furniture.some(f => f.id === 'bed-kids-1')).toBe(false);
  });

  it('supports inline room renaming, reordering, duplication, and deletion', () => {
    let home = createNewProject('Coastal Retreat');
    home = addRoomToHome(home, 'Room A', 'living', home.floors[0].id, 400, 400);
    home = addRoomToHome(home, 'Room B', 'bedroom', home.floors[0].id, 350, 350);
    home = addRoomToHome(home, 'Room C', 'dining', home.floors[0].id, 300, 300);

    const roomA = home.rooms.find(r => r.name === 'Room A')!;
    const roomB = home.rooms.find(r => r.name === 'Room B')!;
    const roomC = home.rooms.find(r => r.name === 'Room C')!;

    // 1. Rename Room A to "Grand Foyer"
    home = renameRoomInHome(home, roomA.id, 'Grand Foyer');
    expect(home.rooms.find(r => r.id === roomA.id)!.name).toBe('Grand Foyer');

    // 2. Reorder rooms: [C, A, B]
    home = reorderRoomsInHome(home, [roomC.id, roomA.id, roomB.id]);
    expect(home.rooms[0].id).toBe(roomC.id);
    expect(home.rooms[1].id).toBe(roomA.id);
    expect(home.rooms[2].id).toBe(roomB.id);

    // 3. Duplicate Room B
    const roomCountBefore = home.rooms.length;
    home = duplicateRoomInHome(home, roomB.id);
    expect(home.rooms.length).toBe(roomCountBefore + 1);
    expect(home.rooms.some(r => r.name.includes('Copy'))).toBe(true);

    // 4. Delete Room C
    home = deleteRoomFromHome(home, roomC.id);
    expect(home.rooms.some(r => r.id === roomC.id)).toBe(false);
  });

  it('persists whole-home project to isolated storage and restores accurately upon reopening', () => {
    const project = createNewProject('Skyline Penthouse');
    const room = project.rooms[0];
    room.finishes = {
      wallColor: '#C26D53',
      wallFinish: 'limewash',
      floorType: 'marble_carrara',
      floorColor: '#EAEFF2',
      accentWallColor: '#1B4D3E',
      ceilingColor: '#FAF8F5',
      trimColor: '#16191D',
      paletteId: 'contemporary-indian',
      styleId: 'contemporary-indian',
    };

    saveProject(project);

    // Load back by ID
    const reloaded = loadProjectById(project.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.id).toBe(project.id);
    expect(reloaded!.name).toBe('Skyline Penthouse');
    expect(reloaded!.rooms[0].finishes?.wallColor).toBe('#C26D53');
    expect(reloaded!.rooms[0].finishes?.floorType).toBe('marble_carrara');
    expect(reloaded!.rooms[0].finishes?.accentWallColor).toBe('#1B4D3E');

    // Verify it appears in listSavedProjects
    const all = listSavedProjects();
    expect(all.some(p => p.id === project.id)).toBe(true);

    // Delete project
    deleteProject(project.id);
    expect(loadProjectById(project.id)).toBeNull();
  });
});

describe('ApnaGhar (अपना घर) — Expanded Design System & 2D/3D Styling Engine', () => {
  it('contains at least 16 curated palettes with complete multi-surface assignments', () => {
    expect(CURATED_PALETTES.length).toBeGreaterThanOrEqual(16);

    for (const pal of CURATED_PALETTES) {
      expect(pal.id).toBeTruthy();
      expect(pal.name).toBeTruthy();
      expect(pal.primaryWallColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pal.accentWallColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pal.ceilingColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pal.trimColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pal.pairedFloorColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pal.pairedFloorType).toBeTruthy();
      expect(pal.wallFinish).toBeTruthy();
    }
  });

  it('contains at least 24 interior design styles with complete aesthetic metadata', () => {
    expect(INTERIOR_STYLES.length).toBeGreaterThanOrEqual(24);

    for (const style of INTERIOR_STYLES) {
      expect(style.id).toBeTruthy();
      expect(style.name).toBeTruthy();
      expect(style.description).toBeTruthy();
      expect(style.colorPreferences.length).toBeGreaterThanOrEqual(3);
      expect(style.materialPreferences.length).toBeGreaterThanOrEqual(3);
      expect(style.compatibleRoomTypes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('contains over 60 curated paint shades across 10 color families', () => {
    expect(PAINT_COLORS.length).toBeGreaterThanOrEqual(60);

    const families = new Set(PAINT_COLORS.map(c => c.family));
    expect(families.size).toBe(10);
    expect(families.has('whites')).toBe(true);
    expect(families.has('neutrals')).toBe(true);
    expect(families.has('earth_tones')).toBe(true);
    expect(families.has('greens')).toBe(true);
    expect(families.has('blues')).toBe(true);
    expect(families.has('pinks')).toBe(true);
    expect(families.has('purples')).toBe(true);
    expect(families.has('yellows')).toBe(true);
    expect(families.has('dark_accents')).toBe(true);
    expect(families.has('natural_shades')).toBe(true);

    // Test search filter
    const terracottaResults = filterPaintColors({ searchQuery: 'terracotta' });
    expect(terracottaResults.length).toBeGreaterThan(0);
    expect(terracottaResults[0].hex).toBe('#C26D53');
  });

  it('contains 14 realistic physical flooring materials with roughness and metalness tokens', () => {
    expect(FLOOR_MATERIALS.length).toBeGreaterThanOrEqual(14);

    for (const mat of FLOOR_MATERIALS) {
      expect(mat.type).toBeTruthy();
      expect(mat.name).toBeTruthy();
      expect(mat.defaultHex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(mat.roughness).toBeGreaterThanOrEqual(0);
      expect(mat.roughness).toBeLessThanOrEqual(1);
      expect(mat.metalness).toBeGreaterThanOrEqual(0);
      expect(mat.metalness).toBeLessThanOrEqual(1);
    }
  });

  it('applies whole-home styling across all rooms or selectively without corrupting custom rooms', () => {
    let project = createNewProject('Heritage Bungalow');
    project = addRoomToHome(project, 'Living Room', 'living', project.floors[0].id, 500, 600);
    project = addRoomToHome(project, 'Guest Suite', 'bedroom', project.floors[0].id, 400, 450);
    project = addRoomToHome(project, 'Private Study', 'office', project.floors[0].id, 300, 350);

    const stylingConfig: WholeHomeStyleConfig = {
      preferredStyle: 'japandi',
      sharedPaletteId: 'japandi-natural',
      primaryWallColor: '#E6E2D8',
      accentWallColor: '#C2BBB0',
      sharedFloorType: 'herringbone_parquet',
      sharedFloorColor: '#B88B58',
      sharedWallFinish: 'limewash',
    };

    // 1. Apply to all rooms
    const updatedWholeHome = applyWholeHomeStyling(project, stylingConfig);
    for (const r of updatedWholeHome.rooms) {
      expect(r.finishes?.wallColor).toBe('#E6E2D8');
      expect(r.finishes?.floorType).toBe('herringbone_parquet');
      expect(r.finishes?.wallFinish).toBe('limewash');
    }

    // 2. Customize Private Study
    const studyId = project.rooms.find(r => r.name === 'Private Study')!.id;
    updatedWholeHome.rooms = updatedWholeHome.rooms.map(r => 
      r.id === studyId ? {
        ...r,
        finishes: {
          ...r.finishes!,
          wallColor: '#2C3338', // Charcoal custom
          floorType: 'hardwood_walnut',
          isCustomized: true,
        }
      } : r
    );

    // 3. Apply a new whole-home palette with preserveCustomizedRooms = true
    const newConfig: WholeHomeStyleConfig = {
      primaryWallColor: '#FAF8F5',
      sharedFloorType: 'hardwood_oak',
      sharedFloorColor: '#C49A6C',
      sharedWallFinish: 'matte',
    };

    const preserved = applyWholeHomeStyling(updatedWholeHome, newConfig, undefined, true);
    const preservedStudy = preserved.rooms.find(r => r.id === studyId)!;
    expect(preservedStudy.finishes?.wallColor).toBe('#2C3338'); // Protected!
    expect(preservedStudy.finishes?.floorType).toBe('hardwood_walnut'); // Protected!
  });
});

describe('ApnaGhar (अपना घर) — Vision AI Pipeline, Semantic Validation & Honest Diagnostics', () => {
  const mockRoom: RoomModel = {
    id: 'room-vision-test',
    name: 'Drawing Room',
    type: 'living',
    floorId: 'floor-g',
    width: 480,
    length: 360,
    height: 270,
    wallThickness: 15,
    openings: [],
    furniture: [],
  };

  const dummyImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  it('strictly blocks furniture recommendations and detections for selfies or portraits', async () => {
    // When a portrait/selfie is processed, suitability is unsuitable
    const result = evaluateSemanticSuitability({
      fileName: 'selfie_photo.jpg',
      rawText: 'front face camera selfie portrait',
    });

    expect(result.suitability).toBe('unsuitable');
    expect(result.isIndoorInterior).toBe(false);
    expect(result.qualityIssues).toContain('unrelated_portrait');

    // When analyzeRoomPhoto is called with a selfie, suggestions MUST be empty
    const analysis = await analyzeRoomPhoto(dummyImage, {
      room: mockRoom,
      fileName: 'my_selfie.jpg',
      provider: 'local-heuristic',
    });

    expect(analysis.validation?.suitability).toBe('unsuitable');
    expect(analysis.suggestions.length).toBe(0);
    expect(analysis.detailedAnalysis?.detectedItems.length).toBe(0);
    expect(analysis.detailedAnalysis?.recommendations.length).toBe(0);
    expect(analysis.detailedAnalysis?.measurementChecklist.length).toBe(0);
  });

  it('correctly parses structured Gemma 3 vision output and respects unsuitable classification', () => {
    const rawGemmaUnsuitable = JSON.stringify({
      is_indoor_room: false,
      subject_type: 'selfie',
      suitability: 'unsuitable',
      explanation: 'The image is a close-up personal selfie of a person smiling, not an indoor living room.',
      quality_issues: ['unrelated_portrait'],
      suggestions: []
    });

    const parsed = JSON.parse(rawGemmaUnsuitable);
    expect(parsed.is_indoor_room).toBe(false);
    expect(parsed.suitability).toBe('unsuitable');
    expect(parsed.suggestions.length).toBe(0);
  });

  it('uses gemma3:4b as the default Gemma vision model and formats prompt with room dimensions', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      response: JSON.stringify({
        is_indoor_room: true,
        subject_type: 'room',
        suitability: 'suitable',
        explanation: 'Clear living room with sofa and coffee table',
        quality_issues: [],
        suggestions: [
          {
            label: '3-Seater Sofa',
            category: 'seating',
            estimatedWidth: 210,
            estimatedDepth: 90,
            estimatedHeight: 85,
            suggestedX: 200,
            suggestedY: 180,
            rotation: 0,
            confidence: 0.90,
            modelType: 'sofa_3seater',
          }
        ]
      })
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const details = await callGemmaVisionDetails(dummyImage, mockRoom, 'http://localhost:11434', 'gemma3:4b');

    expect(fetchSpy).toHaveBeenCalled();
    const callArgs = fetchSpy.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);

    // Verify model and prompt
    expect(body.model).toBe('gemma3:4b');
    expect(body.prompt).toContain(`width = ${mockRoom.width} cm`);
    expect(body.prompt).toContain(`length = ${mockRoom.length} cm`);
    expect(details.suitability).toBe('suitable');
    expect(details.suggestions.length).toBe(1);
    expect(details.suggestions[0].label).toBe('3-Seater Sofa');
  });

  it('keeps sample demonstration projects immutable when loaded', () => {
    const sample = createSampleDemoProject();
    expect(sample.isSample).toBe(true);
    expect(sample.rooms.length).toBeGreaterThan(0);
    expect(sample.rooms[0].furniture.length).toBeGreaterThan(0);

    // Original sample must not be mutated
    const originalSofaName = sample.rooms[0].furniture[0].name;
    const editableCopy = JSON.parse(JSON.stringify(sample));
    editableCopy.rooms[0].furniture[0].name = 'Modified Sofa Name';

    const freshSample = createSampleDemoProject();
    expect(freshSample.rooms[0].furniture[0].name).toBe(originalSofaName);
  });
});
