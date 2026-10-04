import { describe, it, expect } from 'vitest';
import { evaluateRoomFit } from '../utils/fitEngine';
import { RoomModel, FurnitureItem, MANDATORY_FIT_DISCLAIMER } from '../types/model';

describe('Fit Engine Semantics & Evaluation Suite', () => {
  const validRoom: RoomModel = {
    name: 'Standard Room',
    width: 400,
    length: 500,
    height: 260,
    wallThickness: 15,
    openings: [
      {
        id: 'door-1',
        type: 'door',
        wall: 'south',
        offset: 80,
        width: 90,
        height: 210,
        doorSwing: 'inward-left',
        swingClearance: 90,
      },
    ],
  };

  it('flags invalid or non-positive room dimensions as FAIL', () => {
    const invalidRoom: RoomModel = { ...validRoom, width: 0 };
    const report = evaluateRoomFit(invalidRoom, []);
    expect(report.overallStatus).toBe('FAIL');
    expect(report.checks.some(c => c.id === 'room-dimensions-invalid')).toBe(true);
    expect(report.disclaimer).toBe(MANDATORY_FIT_DISCLAIMER);
  });

  it('returns NOT_CHECKED for an empty room with no furniture', () => {
    const report = evaluateRoomFit(validRoom, []);
    expect(report.overallStatus).toBe('NOT_CHECKED');
    expect(report.checks.some(c => c.status === 'NOT_CHECKED')).toBe(true);
    expect(report.disclaimer).toBe(MANDATORY_FIT_DISCLAIMER);
  });

  it('returns PASS when all furniture is well-spaced and confirmed', () => {
    const sofa: FurnitureItem = {
      id: 'sofa-1',
      name: 'Confirmed Sofa',
      category: 'seating',
      width: 200,
      depth: 90,
      height: 85,
      x: 200,
      y: 350,
      z: 0,
      rotation: 0,
      color: '#3d5a80',
      modelType: 'sofa_3seater',
      clearances: { front: 50 },
      provenance: 'catalog',
      isConfirmed: true,
    };

    const table: FurnitureItem = {
      id: 'table-1',
      name: 'Coffee Table',
      category: 'table',
      width: 100,
      depth: 50,
      height: 45,
      x: 200,
      y: 200,
      z: 0,
      rotation: 0,
      color: '#bc6c25',
      modelType: 'coffee_table',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const report = evaluateRoomFit(validRoom, [sofa, table]);
    expect(report.overallStatus).toBe('PASS');
    expect(report.summary.failCount).toBe(0);
    expect(report.summary.reviewCount).toBe(0);
    expect(report.checks.some(c => c.status === 'PASS' && c.id === 'room-boundaries-pass')).toBe(true);
  });

  it('returns FAIL when confirmed furniture overlaps (geometric violation)', () => {
    const itemA: FurnitureItem = {
      id: 'item-a',
      name: 'Desk A',
      category: 'desk',
      width: 120,
      depth: 60,
      height: 75,
      x: 150,
      y: 150,
      z: 0,
      rotation: 0,
      color: '#000000',
      modelType: 'desk',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const itemB: FurnitureItem = {
      id: 'item-b',
      name: 'Desk B',
      category: 'desk',
      width: 120,
      depth: 60,
      height: 75,
      x: 160,
      y: 160, // Strong overlap with itemA
      z: 0,
      rotation: 0,
      color: '#111111',
      modelType: 'desk',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const report = evaluateRoomFit(validRoom, [itemA, itemB]);
    expect(report.overallStatus).toBe('FAIL');
    expect(report.summary.failCount).toBeGreaterThan(0);
    const collisionCheck = report.checks.find(c => c.category === 'furniture-collision');
    expect(collisionCheck?.status).toBe('FAIL');
  });

  it('returns REVIEW instead of FAIL when collision involves unconfirmed photo-derived item', () => {
    const itemA: FurnitureItem = {
      id: 'item-a',
      name: 'Confirmed Desk',
      category: 'desk',
      width: 120,
      depth: 60,
      height: 75,
      x: 150,
      y: 150,
      z: 0,
      rotation: 0,
      color: '#000000',
      modelType: 'desk',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const itemB: FurnitureItem = {
      id: 'item-b',
      name: 'Photo-Estimated Chair',
      category: 'seating',
      width: 80,
      depth: 80,
      height: 75,
      x: 160,
      y: 160, // overlaps
      z: 0,
      rotation: 0,
      color: '#111111',
      modelType: 'armchair',
      clearances: {},
      provenance: 'photo-estimate',
      isConfirmed: false,
      confidence: 0.72,
    };

    const report = evaluateRoomFit(validRoom, [itemA, itemB]);
    expect(report.overallStatus).toBe('REVIEW');
    const collisionCheck = report.checks.find(c => c.id.startsWith('collision-'));
    expect(collisionCheck?.status).toBe('REVIEW');
    expect(report.checks.some(c => c.category === 'measurement-confidence' && c.status === 'REVIEW')).toBe(true);
  });

  it('detects door clearance obstruction and flags FAIL if confirmed', () => {
    const doorObstacle: FurnitureItem = {
      id: 'door-blocker',
      name: 'Blocking Wardrobe',
      category: 'storage',
      width: 90,
      depth: 60,
      height: 190,
      x: 120,
      y: 470, // Inward South door swings into this exact coordinate
      z: 0,
      rotation: 0,
      color: '#444444',
      modelType: 'wardrobe',
      clearances: {},
      provenance: 'catalog',
      isConfirmed: true,
    };

    const report = evaluateRoomFit(validRoom, [doorObstacle]);
    expect(report.overallStatus).toBe('FAIL');
    const doorCheck = report.checks.find(c => c.category === 'door-clearance');
    expect(doorCheck?.status).toBe('FAIL');
  });

  it('flags unconfirmed items with REVIEW status in provenance audit', () => {
    const item: FurnitureItem = {
      id: 'item-unconfirmed',
      name: 'AI Suggested Sofa',
      category: 'seating',
      width: 180,
      depth: 85,
      height: 80,
      x: 200,
      y: 200,
      z: 0,
      rotation: 0,
      color: '#3d5a80',
      modelType: 'sofa_3seater',
      clearances: {},
      provenance: 'ai-suggestion',
      isConfirmed: false,
      confidence: 0.75,
    };

    const report = evaluateRoomFit(validRoom, [item]);
    expect(report.overallStatus).toBe('REVIEW');
    const provCheck = report.checks.find(c => c.category === 'measurement-confidence');
    expect(provCheck?.status).toBe('REVIEW');
  });
});
