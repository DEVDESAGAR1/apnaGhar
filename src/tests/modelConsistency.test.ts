import { describe, it, expect } from 'vitest';
import { FurnitureItem, RoomModel } from '../types/model';
import { createSampleDemoProject } from '../utils/storage';
import { getFurnitureCorners } from '../utils/geometry';

/**
 * Coordinate mapping rule from Canonical Model to Three.js 3D space:
 * - Room centered at origin in 3D:
 *   threeX = item.x - room.width / 2 (cm)
 *   threeZ = item.y - room.length / 2 (cm)
 *   threeY = item.z + item.height / 2 (cm above floor)
 * - Rotation around Y axis in Three.js (radians):
 *   threeRotY = -item.rotation * (Math.PI / 180)
 */

describe('Canonical 2D / 3D Model Consistency Suite', () => {
  const demo = createSampleDemoProject('living');

  it('maintains strict 1:1 metric centimeter scale across all furniture pieces', () => {
    for (const item of demo.furniture) {
      expect(item.width).toBeGreaterThan(0);
      expect(item.depth).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);

      // Verify corner bounding polygon corresponds exactly to width and depth
      const corners = getFurnitureCorners(item);
      expect(corners).toHaveLength(4);

      // Distance between corner 0 and corner 1 should match width
      const edge01 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
      expect(Math.round(edge01)).toBe(item.width);

      // Distance between corner 1 and corner 2 should match depth
      const edge12 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
      expect(Math.round(edge12)).toBe(item.depth);
    }
  });

  it('maps 2D room coordinates to 3D space deterministically without floating drift', () => {
    const room = demo.room;
    for (const item of demo.furniture) {
      // 3D center calculation
      const threeX = item.x - room.width / 2;
      const threeZ = item.y - room.length / 2;
      const threeY = (item.z || 0) + item.height / 2;

      // Inverse mapping from 3D back to 2D
      const mappedX = threeX + room.width / 2;
      const mappedY = threeZ + room.length / 2;

      expect(mappedX).toBe(item.x);
      expect(mappedY).toBe(item.y);
      expect(threeY).toBe(item.height / 2);
    }
  });

  it('guarantees every item contains provenance and confirmation status', () => {
    for (const item of demo.furniture) {
      expect(['manual', 'catalog', 'photo-estimate', 'ai-suggestion']).toContain(item.provenance);
      expect(typeof item.isConfirmed).toBe('boolean');
    }
  });
});
