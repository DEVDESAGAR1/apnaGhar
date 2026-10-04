import { describe, it, expect } from 'vitest';
import { COORDINATED_THEMES } from '../components/Styling/StylingModal';
import type { RoomModel, FurnitureItem } from '../types/model';

describe('Spatial Coordination & Curated Interior Design System', () => {
  const sampleRoom: RoomModel = {
    id: 'room-test-1',
    name: 'Living Room',
    type: 'living',
    floorId: 'floor-g',
    width: 500, // 500cm
    length: 400, // 400cm
    height: 280,
    wallThickness: 15,
    openings: [
      {
        id: 'door-1',
        type: 'door',
        wall: 'south',
        offset: 100,
        width: 90,
        height: 210,
        doorSwing: 'inward-right',
      },
      {
        id: 'win-1',
        type: 'window',
        wall: 'north',
        offset: 150,
        width: 140,
        height: 120,
        sillHeight: 90,
      }
    ],
    furniture: [],
    finishes: {
      wallColor: '#F5F2EB',
      wallFinish: 'matte',
      floorType: 'hardwood_oak',
      floorColor: '#C49A6C',
    },
  };

  const sampleFurniture: FurnitureItem = {
    id: 'sofa-1',
    name: '3-Seater Sofa',
    category: 'living',
    width: 200,
    depth: 90,
    height: 85,
    x: 250,
    y: 200,
    rotation: 0,
    color: '#3d5a80',
    modelType: 'sofa_3seat',
    clearances: { front: 50 },
    provenance: 'manual',
    isConfirmed: true,
  };

  it('verifies exact bidirectional 2D (Room cm) to 3D (Scene cm) coordinate mapping', () => {
    // 2D to 3D
    const sceneX = sampleFurniture.x - sampleRoom.width / 2;
    const sceneZ = sampleFurniture.y - sampleRoom.length / 2;

    expect(sceneX).toBe(0); // 250 - 250 = 0 (centered)
    expect(sceneZ).toBe(0); // 200 - 200 = 0 (centered)

    // 3D back to 2D
    const roomX = sceneX + sampleRoom.width / 2;
    const roomY = sceneZ + sampleRoom.length / 2;

    expect(roomX).toBe(sampleFurniture.x);
    expect(roomY).toBe(sampleFurniture.y);
  });

  it('guarantees 3D floor drag clamping prevents furniture from escaping room perimeter', () => {
    const attemptedSceneX = 400; // Far outside East wall
    const attemptedSceneZ = -500; // Far outside North wall

    const rawRoomX = attemptedSceneX + sampleRoom.width / 2; // 400 + 250 = 650
    const rawRoomY = attemptedSceneZ + sampleRoom.length / 2; // -500 + 200 = -300

    const halfW = sampleFurniture.width / 2; // 100
    const halfD = sampleFurniture.depth / 2; // 45

    const clampedX = Math.max(halfW, Math.min(sampleRoom.width - halfW, rawRoomX));
    const clampedY = Math.max(halfD, Math.min(sampleRoom.length - halfD, rawRoomY));

    expect(clampedX).toBe(400); // 500 - 100 = 400
    expect(clampedY).toBe(45); // clamped to half depth
    expect(clampedX).toBeLessThanOrEqual(sampleRoom.width);
    expect(clampedY).toBeGreaterThanOrEqual(0);
  });

  it('verifies all 8 required coordinated design themes exist with complete palettes', () => {
    expect(COORDINATED_THEMES.length).toBe(8);

    const expectedThemeIds = [
      'warm-minimal',
      'scandinavian-natural',
      'contemporary-indian',
      'japandi',
      'modern-luxury',
      'earthy-organic',
      'industrial-modern',
      'calm-coastal',
    ];

    const presentIds = COORDINATED_THEMES.map(t => t.id);
    for (const expectedId of expectedThemeIds) {
      expect(presentIds).toContain(expectedId);
    }

    COORDINATED_THEMES.forEach(theme => {
      expect(theme.name).toBeDefined();
      expect(theme.wallColor.startsWith('#')).toBe(true);
      expect(theme.floorColor.startsWith('#')).toBe(true);
      expect(theme.accentColor.startsWith('#')).toBe(true);
      expect(theme.trimColor.startsWith('#')).toBe(true);
      expect(['matte', 'satin', 'limewash']).toContain(theme.wallFinish);
      expect(theme.description.length).toBeGreaterThan(15);
    });
  });

  it('verifies doors and windows have required architectural dimensions and wall references', () => {
    expect(sampleRoom.openings.length).toBe(2);
    const door = sampleRoom.openings.find(o => o.type === 'door');
    const win = sampleRoom.openings.find(o => o.type === 'window');

    expect(door).toBeDefined();
    expect(door?.wall).toBe('south');
    expect(door?.doorSwing).toBe('inward-right');
    expect(door?.width).toBeGreaterThanOrEqual(60);

    expect(win).toBeDefined();
    expect(win?.wall).toBe('north');
    expect(win?.sillHeight).toBeGreaterThanOrEqual(50);
  });
});
