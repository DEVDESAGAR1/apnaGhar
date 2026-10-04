import { describe, it, expect } from 'vitest';
import { 
  getFurnitureCorners, 
  checkInsideRoomBounds, 
  doPolygonsIntersect, 
  getDoorSwingPolygon, 
  getClearancePolygon,
  snapToGrid
} from '../utils/geometry';
import { FurnitureItem, RoomOpening, RoomModel } from '../types/model';

describe('2D Geometry & Collision Suite', () => {
  const sampleSofa: FurnitureItem = {
    id: 'sofa-1',
    name: 'Sofa',
    category: 'seating',
    width: 200,
    depth: 90,
    height: 85,
    x: 200,
    y: 200,
    z: 0,
    rotation: 0,
    color: '#3d5a80',
    modelType: 'sofa_3seater',
    clearances: { front: 60 },
    provenance: 'catalog',
    isConfirmed: true,
  };

  it('calculates unrotated furniture corner coordinates correctly', () => {
    const corners = getFurnitureCorners(sampleSofa);
    // Center at (200, 200), width 200, depth 90
    // Corners: (100, 155), (300, 155), (300, 245), (100, 245)
    expect(corners).toHaveLength(4);
    expect(corners[0]).toEqual({ x: 100, y: 155 });
    expect(corners[1]).toEqual({ x: 300, y: 155 });
    expect(corners[2]).toEqual({ x: 300, y: 245 });
    expect(corners[3]).toEqual({ x: 100, y: 245 });
  });

  it('calculates rotated furniture corner coordinates accurately', () => {
    const rotatedSofa: FurnitureItem = {
      ...sampleSofa,
      rotation: 90, // 90 degree rotation swaps width and depth extents
    };
    const corners = getFurnitureCorners(rotatedSofa);
    // Center at (200, 200). Rotated by 90deg clockwise:
    // x extent becomes depth (90), y extent becomes width (200)
    const minX = Math.min(...corners.map(c => c.x));
    const maxX = Math.max(...corners.map(c => c.x));
    const minY = Math.min(...corners.map(c => c.y));
    const maxY = Math.max(...corners.map(c => c.y));

    expect(Math.round(maxX - minX)).toBe(90);
    expect(Math.round(maxY - minY)).toBe(200);
  });

  it('detects when furniture is fully inside room boundaries', () => {
    const roomW = 500;
    const roomL = 500;
    const corners = getFurnitureCorners(sampleSofa);
    const result = checkInsideRoomBounds(corners, roomW, roomL);
    expect(result.inside).toBe(true);
    expect(result.outAmount).toBe(0);
  });

  it('detects when furniture crosses room boundaries', () => {
    const roomW = 500;
    const roomL = 500;
    // Position sofa protruding past west wall (x < 0)
    const protrudingSofa: FurnitureItem = {
      ...sampleSofa,
      x: 50, // width is 200, so minX is 50 - 100 = -50
    };
    const corners = getFurnitureCorners(protrudingSofa);
    const result = checkInsideRoomBounds(corners, roomW, roomL);
    expect(result.inside).toBe(false);
    expect(result.outAmount).toBe(50);
  });

  it('detects rotated furniture boundary crossing', () => {
    const roomW = 400;
    const roomL = 400;
    // Center at (350, 200), width 200, rotated 0 -> maxX = 450 (crosses 400 by 50)
    const item: FurnitureItem = { ...sampleSofa, x: 350, y: 200, rotation: 0 };
    const res = checkInsideRoomBounds(getFurnitureCorners(item), roomW, roomL);
    expect(res.inside).toBe(false);
    expect(res.outAmount).toBe(50);

    // If rotated 90°, width extent becomes 90cm -> maxX = 350 + 45 = 395 (inside 400!)
    const rotatedItem: FurnitureItem = { ...sampleSofa, x: 350, y: 200, rotation: 90 };
    const resRotated = checkInsideRoomBounds(getFurnitureCorners(rotatedItem), roomW, roomL);
    expect(resRotated.inside).toBe(true);
  });

  it('detects axis-aligned rectangle overlaps', () => {
    const table: FurnitureItem = {
      id: 'table-1',
      name: 'Coffee Table',
      category: 'table',
      width: 100,
      depth: 60,
      height: 45,
      x: 200,
      y: 200, // exact same center as sampleSofa
      z: 0,
      rotation: 0,
      color: '#bc6c25',
      modelType: 'coffee_table',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const polySofa = getFurnitureCorners(sampleSofa);
    const polyTable = getFurnitureCorners(table);
    expect(doPolygonsIntersect(polySofa, polyTable)).toBe(true);

    // Shift table far away so they do not overlap
    const farTable: FurnitureItem = { ...table, x: 400, y: 400 };
    expect(doPolygonsIntersect(polySofa, getFurnitureCorners(farTable))).toBe(false);
  });

  it('detects overlap for arbitrarily rotated rectangles using SAT', () => {
    // Sofa at (200, 200), width 200, depth 100, rotation 45 deg
    const sofaRot45: FurnitureItem = {
      ...sampleSofa,
      width: 200,
      depth: 100,
      rotation: 45,
    };

    // Box at (200, 280), width 60, depth 60, unrotated
    const box: FurnitureItem = {
      id: 'box-1',
      name: 'Small Box',
      category: 'other',
      width: 60,
      depth: 60,
      height: 40,
      x: 200,
      y: 280,
      z: 0,
      rotation: 0,
      color: '#ffffff',
      modelType: 'box',
      clearances: {},
      provenance: 'manual',
      isConfirmed: true,
    };

    const polySofa = getFurnitureCorners(sofaRot45);
    const polyBox = getFurnitureCorners(box);
    expect(doPolygonsIntersect(polySofa, polyBox)).toBe(true);

    // Move box further down so diagonal tip does not touch
    const distantBox: FurnitureItem = { ...box, y: 350 };
    expect(doPolygonsIntersect(polySofa, getFurnitureCorners(distantBox))).toBe(false);
  });

  it('evaluates door swing polygons and detects door obstruction', () => {
    const room: RoomModel = {
      name: 'Test Room',
      width: 400,
      length: 500,
      height: 260,
      wallThickness: 15,
      openings: [],
    };

    const southDoor: RoomOpening = {
      id: 'door-1',
      type: 'door',
      wall: 'south',
      offset: 100,
      width: 90,
      height: 210,
      doorSwing: 'inward-left',
      swingClearance: 90,
    };

    const doorPoly = getDoorSwingPolygon(southDoor, room);
    expect(doorPoly).not.toBeNull();
    expect(doorPoly!.length).toBeGreaterThan(4);

    // Place an armchair directly inside the door opening radius
    const blockingChair: FurnitureItem = {
      id: 'chair-blocking',
      name: 'Blocking Chair',
      category: 'seating',
      width: 70,
      depth: 70,
      height: 80,
      x: 130,
      y: 450, // South wall is at y = 500, door swing sweeps inward toward y=410
      z: 0,
      rotation: 0,
      color: '#ff0000',
      modelType: 'armchair',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const chairCorners = getFurnitureCorners(blockingChair);
    expect(doPolygonsIntersect(doorPoly!, chairCorners)).toBe(true);

    // Move chair away into safe room area
    const safeChair: FurnitureItem = { ...blockingChair, x: 300, y: 200 };
    expect(doPolygonsIntersect(doorPoly!, getFurnitureCorners(safeChair))).toBe(false);
  });

  it('snaps coordinates to grid step properly', () => {
    expect(snapToGrid(42, 5)).toBe(40);
    expect(snapToGrid(43, 5)).toBe(45);
    expect(snapToGrid(47, 10)).toBe(50);
    expect(snapToGrid(44, 10)).toBe(40);
  });
});
