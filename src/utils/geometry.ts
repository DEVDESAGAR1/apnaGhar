import type { FurnitureItem, RoomOpening, RoomModel } from '../types/model';

export interface Point2D {
  x: number;
  y: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Normalize an angle to [0, 360)
 */
export function normalizeAngle(degrees: number): number {
  const mod = degrees % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Rotate a local point (lx, ly) by angle (degrees) and translate to (cx, cy)
 */
export function transformPoint(
  lx: number, 
  ly: number, 
  cx: number, 
  cy: number, 
  angleDeg: number
): Point2D {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + (lx * cos - ly * sin),
    y: cy + (lx * sin + ly * cos),
  };
}

/**
 * Returns the 4 corner points of a rotated furniture item in world coordinates.
 * Coordinates are ordered: Top-Left, Top-Right, Bottom-Right, Bottom-Left in local orientation.
 */
export function getFurnitureCorners(item: FurnitureItem): Point2D[] {
  const hw = item.width / 2;
  const hd = item.depth / 2;
  const rot = item.rotation || 0;

  return [
    transformPoint(-hw, -hd, item.x, item.y, rot),
    transformPoint(hw, -hd, item.x, item.y, rot),
    transformPoint(hw, hd, item.x, item.y, rot),
    transformPoint(-hw, hd, item.x, item.y, rot),
  ];
}

/**
 * Calculate the axis-aligned bounding box (AABB) of an arbitrary 2D polygon
 */
export function getPolygonAABB(points: Point2D[]): BoundingBox2D {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Check if all points of a polygon reside strictly inside the room rectangle [0..roomW, 0..roomL].
 * Returns details on any out-of-bound extent.
 */
export function checkInsideRoomBounds(
  poly: Point2D[], 
  roomW: number, 
  roomL: number
): { inside: boolean; aabb: BoundingBox2D; outAmount: number } {
  const aabb = getPolygonAABB(poly);
  let outAmount = 0;

  if (aabb.minX < 0) outAmount = Math.max(outAmount, -aabb.minX);
  if (aabb.minY < 0) outAmount = Math.max(outAmount, -aabb.minY);
  if (aabb.maxX > roomW) outAmount = Math.max(outAmount, aabb.maxX - roomW);
  if (aabb.maxY > roomL) outAmount = Math.max(outAmount, aabb.maxY - roomL);

  return {
    inside: outAmount <= 0.001,
    aabb,
    outAmount: Math.round(outAmount * 10) / 10,
  };
}

/**
 * Separating Axis Theorem (SAT) for 2D Convex Polygon Overlap
 * Handles any combination of convex polygons and rotated rectangles.
 */
export function doPolygonsIntersect(polyA: Point2D[], polyB: Point2D[]): boolean {
  if (polyA.length < 3 || polyB.length < 3) return false;

  // First check fast AABB overlap
  const aabbA = getPolygonAABB(polyA);
  const aabbB = getPolygonAABB(polyB);
  if (
    aabbA.maxX < aabbB.minX || 
    aabbA.minX > aabbB.maxX || 
    aabbA.maxY < aabbB.minY || 
    aabbA.minY > aabbB.maxY
  ) {
    return false;
  }

  const polygons = [polyA, polyB];

  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    for (let i1 = 0; i1 < polygon.length; i1++) {
      const i2 = (i1 + 1) % polygon.length;
      const p1 = polygon[i1];
      const p2 = polygon[i2];

      // Normal vector perpendicular to the edge (edge: (dx, dy), normal: (-dy, dx))
      const normal: Vector2D = {
        x: -(p2.y - p1.y),
        y: p2.x - p1.x,
      };

      // Project polyA onto normal
      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of polyA) {
        const projected = normal.x * p.x + normal.y * p.y;
        if (projected < minA) minA = projected;
        if (projected > maxA) maxA = projected;
      }

      // Project polyB onto normal
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of polyB) {
        const projected = normal.x * p.x + normal.y * p.y;
        if (projected < minB) minB = projected;
        if (projected > maxB) maxB = projected;
      }

      // Check for separation along this normal axis
      // A small epsilon avoids false positives on strictly touching edges
      const EPSILON = 0.05;
      if (maxA <= minB + EPSILON || maxB <= minA + EPSILON) {
        return false; // Found separating axis, no intersection
      }
    }
  }

  return true; // No separating axis found -> polygons intersect
}

/**
 * Returns the clearance buffer polygon for an item (e.g. front drawer/seating zone)
 * Front clearance extends along the local +Y direction (or customized)
 */
export function getClearancePolygon(
  item: FurnitureItem, 
  zone: 'front' | 'back' | 'left' | 'right'
): Point2D[] | null {
  const depth = item.clearances[zone];
  if (!depth || depth <= 0) return null;

  const hw = item.width / 2;
  const hd = item.depth / 2;
  const rot = item.rotation || 0;

  let localCorners: Point2D[] = [];

  if (zone === 'front') {
    // Extends forward from bottom edge (positive Y)
    localCorners = [
      { x: -hw, y: hd },
      { x: hw, y: hd },
      { x: hw, y: hd + depth },
      { x: -hw, y: hd + depth },
    ];
  } else if (zone === 'back') {
    // Extends backward from top edge (negative Y)
    localCorners = [
      { x: -hw, y: -hd - depth },
      { x: hw, y: -hd - depth },
      { x: hw, y: -hd },
      { x: -hw, y: -hd },
    ];
  } else if (zone === 'left') {
    // Extends leftward from left edge (negative X)
    localCorners = [
      { x: -hw - depth, y: -hd },
      { x: -hw, y: -hd },
      { x: -hw, y: hd },
      { x: -hw - depth, y: hd },
    ];
  } else if (zone === 'right') {
    // Extends rightward from right edge (positive X)
    localCorners = [
      { x: hw, y: -hd },
      { x: hw + depth, y: -hd },
      { x: hw + depth, y: hd },
      { x: hw, y: hd },
    ];
  }

  return localCorners.map(p => transformPoint(p.x, p.y, item.x, item.y, rot));
}

/**
 * Returns the polygon representation of a door's swing clearance path inside the room.
 * For an inward-opening door, the door blade sweeps an arc inside the room.
 */
export function getDoorSwingPolygon(door: RoomOpening, room: RoomModel): Point2D[] | null {
  if (door.type !== 'door' || !door.doorSwing || door.doorSwing === 'none') {
    return null;
  }

  const swingRadius = door.swingClearance || door.width;
  const numArcSegments = 8;
  const arcPoints: Point2D[] = [];

  // Determine door hinge point and wall orientation
  let hingeX = 0;
  let hingeY = 0;
  let closedAngle = 0; // degrees
  let sweepAngle = 90; // degrees

  // Coordinates:
  // North wall: y = 0, x from 0 to room.width
  // South wall: y = room.length, x from 0 to room.width
  // East wall:  x = room.width, y from 0 to room.length
  // West wall:  x = 0, y from 0 to room.length

  const isLeftHinge = door.doorSwing.includes('left');
  const isInward = door.doorSwing.startsWith('inward');

  if (door.wall === 'north') {
    hingeY = 0;
    hingeX = isLeftHinge ? door.offset : door.offset + door.width;
    closedAngle = isLeftHinge ? 0 : 180;
    // Inward swings down into room (+Y)
    sweepAngle = isLeftHinge ? 90 : -90;
    if (!isInward) sweepAngle = -sweepAngle;
  } else if (door.wall === 'south') {
    hingeY = room.length;
    hingeX = isLeftHinge ? door.offset : door.offset + door.width;
    closedAngle = isLeftHinge ? 0 : 180;
    // Inward swings up into room (-Y)
    sweepAngle = isLeftHinge ? -90 : 90;
    if (!isInward) sweepAngle = -sweepAngle;
  } else if (door.wall === 'west') {
    hingeX = 0;
    hingeY = isLeftHinge ? door.offset : door.offset + door.width;
    closedAngle = isLeftHinge ? 90 : 270;
    // Inward swings right into room (+X)
    sweepAngle = isLeftHinge ? -90 : 90;
    if (!isInward) sweepAngle = -sweepAngle;
  } else if (door.wall === 'east') {
    hingeX = room.width;
    hingeY = isLeftHinge ? door.offset : door.offset + door.width;
    closedAngle = isLeftHinge ? 90 : 270;
    // Inward swings left into room (-X)
    sweepAngle = isLeftHinge ? 90 : -90;
    if (!isInward) sweepAngle = -sweepAngle;
  }

  // Add hinge center
  arcPoints.push({ x: hingeX, y: hingeY });

  // Add sampled arc points
  for (let s = 0; s <= numArcSegments; s++) {
    const fraction = s / numArcSegments;
    const currentAngle = closedAngle + sweepAngle * fraction;
    const rad = degToRad(currentAngle);
    arcPoints.push({
      x: hingeX + swingRadius * Math.cos(rad),
      y: hingeY + swingRadius * Math.sin(rad),
    });
  }

  return arcPoints;
}

/**
 * Snap a point (x, y) to a given grid interval (e.g. 5cm or 10cm)
 */
export function snapToGrid(val: number, step: number = 5): number {
  if (step <= 0) return val;
  return Math.round(val / step) * step;
}
