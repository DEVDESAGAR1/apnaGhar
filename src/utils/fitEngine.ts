import { MANDATORY_FIT_DISCLAIMER } from '../types/model';
import type { 
  FitReport, 
  FitStatus, 
  FitCheckItem, 
  RoomModel, 
  FurnitureItem 
} from '../types/model';
import { 
  getFurnitureCorners, 
  checkInsideRoomBounds, 
  doPolygonsIntersect, 
  getDoorSwingPolygon, 
  getClearancePolygon 
} from './geometry';

/**
 * FitCheck Geometric Evaluation Engine
 * Pure logic independent of any AI or rendering framework.
 */
export function evaluateRoomFit(room: RoomModel, furniture: FurnitureItem[]): FitReport {
  const checks: FitCheckItem[] = [];

  // 1. Room Dimension Validity Check
  if (!room || room.width <= 0 || room.length <= 0 || room.height <= 0) {
    checks.push({
      id: 'room-dimensions-invalid',
      title: 'Invalid Room Dimensions',
      description: 'Room dimensions must be positive non-zero measurements.',
      category: 'room-boundary',
      status: 'FAIL',
      affectedItemIds: [],
      severity: 'error',
      details: `Width: ${room?.width ?? 0}cm, Length: ${room?.length ?? 0}cm, Height: ${room?.height ?? 0}cm`,
      remedyRecommendation: 'Specify valid room width, length, and height in Room Settings.',
    });

    return {
      overallStatus: 'FAIL',
      generatedAt: new Date().toISOString(),
      summary: { passCount: 0, failCount: 1, reviewCount: 0, notCheckedCount: 0 },
      checks,
      disclaimer: MANDATORY_FIT_DISCLAIMER,
    };
  }

  // 2. Empty Room Case
  if (!furniture || furniture.length === 0) {
    checks.push({
      id: 'no-furniture',
      title: 'Room has no furniture items',
      description: 'Add furniture from the catalog or import suggestions to evaluate fit.',
      category: 'furniture-collision',
      status: 'NOT_CHECKED',
      affectedItemIds: [],
      severity: 'info',
      details: 'Planner is empty.',
      remedyRecommendation: 'Add furniture items using the Catalog or AI Room Photo assistant.',
    });

    return {
      overallStatus: 'NOT_CHECKED',
      generatedAt: new Date().toISOString(),
      summary: { passCount: 0, failCount: 0, reviewCount: 0, notCheckedCount: 1 },
      checks,
      disclaimer: MANDATORY_FIT_DISCLAIMER,
    };
  }

  // 3. Boundary Checks (Every furniture item inside room walls)
  let boundaryViolations = 0;
  for (const item of furniture) {
    const corners = getFurnitureCorners(item);
    const boundsResult = checkInsideRoomBounds(corners, room.width, room.length);

    if (!boundsResult.inside) {
      boundaryViolations++;
      const isCertain = item.isConfirmed && item.provenance !== 'photo-estimate';
      const checkStatus: FitStatus = isCertain ? 'FAIL' : 'REVIEW';
      
      checks.push({
        id: `boundary-${item.id}`,
        title: `Boundary Breach: "${item.name}"`,
        description: `"${item.name}" extends ${boundsResult.outAmount} cm outside the room perimeter.`,
        category: 'room-boundary',
        status: checkStatus,
        affectedItemIds: [item.id],
        severity: isCertain ? 'error' : 'warning',
        details: `Bounds: [${Math.round(boundsResult.aabb.minX)}, ${Math.round(boundsResult.aabb.minY)}] to [${Math.round(boundsResult.aabb.maxX)}, ${Math.round(boundsResult.aabb.maxY)}], Room: [0, 0] to [${room.width}, ${room.length}]. Provenance: ${item.provenance} (${item.isConfirmed ? 'Confirmed' : 'Unconfirmed'}).`,
        remedyRecommendation: `Move or rotate "${item.name}" inward away from walls, or check its physical dimensions.`,
      });
    }
  }

  if (boundaryViolations === 0) {
    checks.push({
      id: 'room-boundaries-pass',
      title: 'All Furniture Within Room Perimeter',
      description: `All ${furniture.length} items reside fully inside the ${room.width} × ${room.length} cm walls.`,
      category: 'room-boundary',
      status: 'PASS',
      affectedItemIds: [],
      severity: 'info',
    });
  }

  // 4. Furniture Overlap / Collision Check (Pairwise SAT)
  let collisionCount = 0;
  const itemCornersMap = new Map<string, ReturnType<typeof getFurnitureCorners>>();
  for (const item of furniture) {
    itemCornersMap.set(item.id, getFurnitureCorners(item));
  }

  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const itemA = furniture[i];
      const itemB = furniture[j];
      const polyA = itemCornersMap.get(itemA.id)!;
      const polyB = itemCornersMap.get(itemB.id)!;

      const collides = doPolygonsIntersect(polyA, polyB);
      if (collides) {
        collisionCount++;
        const bothConfirmed = 
          itemA.isConfirmed && itemA.provenance !== 'photo-estimate' &&
          itemB.isConfirmed && itemB.provenance !== 'photo-estimate';

        const status: FitStatus = bothConfirmed ? 'FAIL' : 'REVIEW';

        checks.push({
          id: `collision-${itemA.id}-${itemB.id}`,
          title: `Collision: "${itemA.name}" & "${itemB.name}"`,
          description: `Geometric footprint overlap detected between "${itemA.name}" and "${itemB.name}".`,
          category: 'furniture-collision',
          status,
          affectedItemIds: [itemA.id, itemB.id],
          severity: bothConfirmed ? 'error' : 'warning',
          details: `Item A: ${itemA.name} (${itemA.width}x${itemA.depth}cm, rot ${itemA.rotation}°, ${itemA.provenance}). Item B: ${itemB.name} (${itemB.width}x${itemB.depth}cm, rot ${itemB.rotation}°, ${itemB.provenance}).`,
          remedyRecommendation: 'Reposition one or both items to eliminate physical overlap.',
        });
      }
    }
  }

  if (collisionCount === 0 && furniture.length > 1) {
    checks.push({
      id: 'collisions-pass',
      title: 'No Furniture Footprint Collisions',
      description: `Evaluated ${furniture.length} items; zero physical overlaps detected.`,
      category: 'furniture-collision',
      status: 'PASS',
      affectedItemIds: [],
      severity: 'info',
    });
  }

  // 5. Door Opening Clearance Checks
  const doors = (room.openings || []).filter(o => o.type === 'door');
  let doorClearanceViolations = 0;

  for (const door of doors) {
    const swingPoly = getDoorSwingPolygon(door, room);
    if (!swingPoly) continue;

    for (const item of furniture) {
      const itemCorners = itemCornersMap.get(item.id)!;
      const overlapsDoor = doPolygonsIntersect(swingPoly, itemCorners);

      if (overlapsDoor) {
        doorClearanceViolations++;
        const isCertain = item.isConfirmed && item.provenance !== 'photo-estimate';
        const status: FitStatus = isCertain ? 'FAIL' : 'REVIEW';

        checks.push({
          id: `door-blocked-${door.id}-${item.id}`,
          title: `Door Swing Obstructed: "${item.name}"`,
          description: `Door on ${door.wall} wall cannot swing freely because "${item.name}" encroaches into its opening arc.`,
          category: 'door-clearance',
          status,
          affectedItemIds: [item.id],
          severity: isCertain ? 'error' : 'warning',
          details: `Door: ${door.width}cm wide on ${door.wall} wall with swing '${door.doorSwing || 'inward'}'. Obstructing item: ${item.name} (${item.width}x${item.depth}cm).`,
          remedyRecommendation: `Keep a minimum ${door.width}cm radius arc clear around the door hinge to allow entry and exit.`,
        });
      }
    }
  }

  if (doors.length > 0 && doorClearanceViolations === 0) {
    checks.push({
      id: 'doors-pass',
      title: 'Door Swing Paths Clear',
      description: `All ${doors.length} door openings have unobstructed swing clearance.`,
      category: 'door-clearance',
      status: 'PASS',
      affectedItemIds: [],
      severity: 'info',
    });
  }

  // 6. Functional Clearance Zones (e.g. drawer pullouts, seating legroom)
  let clearanceZoneIssues = 0;
  for (const item of furniture) {
    const zones: ('front' | 'back' | 'left' | 'right')[] = ['front', 'back', 'left', 'right'];
    for (const zone of zones) {
      const clearPoly = getClearancePolygon(item, zone);
      if (!clearPoly) continue;

      // Check against room boundary
      const bounds = checkInsideRoomBounds(clearPoly, room.width, room.length);
      if (!bounds.inside && zone === 'front') {
        clearanceZoneIssues++;
        checks.push({
          id: `clearance-wall-${item.id}-${zone}`,
          title: `Limited Clearance: "${item.name}" Front Access`,
          description: `The front functional clearance zone of "${item.name}" (${item.clearances.front}cm) extends past the wall.`,
          category: 'functional-clearance',
          status: 'REVIEW',
          affectedItemIds: [item.id],
          severity: 'warning',
          details: `Recommended front space: ${item.clearances.front}cm for comfortable access/pullout.`,
          remedyRecommendation: `Leave at least ${item.clearances.front}cm in front of "${item.name}" for practical use.`,
        });
      }

      // Check against other furniture
      for (const other of furniture) {
        if (other.id === item.id) continue;
        const otherCorners = itemCornersMap.get(other.id)!;
        if (doPolygonsIntersect(clearPoly, otherCorners)) {
          clearanceZoneIssues++;
          checks.push({
            id: `clearance-item-${item.id}-${other.id}-${zone}`,
            title: `Clearance Zone Infringed: "${item.name}" by "${other.name}"`,
            description: `"${other.name}" enters the ${zone} clearance zone (${item.clearances[zone]}cm) of "${item.name}".`,
            category: 'functional-clearance',
            status: 'REVIEW',
            affectedItemIds: [item.id, other.id],
            severity: 'warning',
            details: `Clearance buffer needed: ${item.clearances[zone]}cm. May restrict walking path or drawer access.`,
            remedyRecommendation: `Shift "${other.name}" to maintain comfortable human passage and usability.`,
          });
        }
      }
    }
  }

  // 7. Measurement Provenance & Unconfirmed Items Check
  const unconfirmedItems = furniture.filter(
    item => !item.isConfirmed || item.provenance === 'photo-estimate' || item.provenance === 'ai-suggestion'
  );

  if (unconfirmedItems.length > 0) {
    for (const unconfirmed of unconfirmedItems) {
      const confStr = unconfirmed.confidence 
        ? ` (${Math.round(unconfirmed.confidence * 100)}% estimated confidence)` 
        : '';
      
      checks.push({
        id: `provenance-${unconfirmed.id}`,
        title: `Unconfirmed Dimensions: "${unconfirmed.name}"`,
        description: `Dimensions for "${unconfirmed.name}" (${unconfirmed.width} × ${unconfirmed.depth} × ${unconfirmed.height} cm) are marked as ${unconfirmed.provenance}${confStr}.`,
        category: 'measurement-confidence',
        status: 'REVIEW',
        affectedItemIds: [unconfirmed.id],
        severity: 'warning',
        details: 'Photo-derived or suggested measurements are approximations and must be physically verified before purchase.',
        remedyRecommendation: 'Measure the real furniture or check catalog specifications, then click "Confirm Measurement" in the item inspector.',
      });
    }
  } else {
    checks.push({
      id: 'provenance-all-confirmed',
      title: 'All Dimensions Confirmed',
      description: 'All furniture dimensions are verified manual or catalog measurements.',
      category: 'measurement-confidence',
      status: 'PASS',
      affectedItemIds: [],
      severity: 'info',
    });
  }

  // Determine Overall Status based on strict semantics:
  // - FAIL: a confirmed geometric constraint is violated.
  // - REVIEW: a result depends on uncertain, estimated, or unconfirmed input.
  // - PASS: all relevant configured checks pass with adequate inputs.
  // - NOT_CHECKED: insufficient information exists.
  let overallStatus: FitStatus = 'PASS';
  let failCount = 0;
  let reviewCount = 0;
  let passCount = 0;
  let notCheckedCount = 0;

  for (const c of checks) {
    if (c.status === 'FAIL') failCount++;
    else if (c.status === 'REVIEW') reviewCount++;
    else if (c.status === 'PASS') passCount++;
    else if (c.status === 'NOT_CHECKED') notCheckedCount++;
  }

  if (failCount > 0) {
    overallStatus = 'FAIL';
  } else if (reviewCount > 0) {
    overallStatus = 'REVIEW';
  } else if (passCount > 0) {
    overallStatus = 'PASS';
  } else {
    overallStatus = 'NOT_CHECKED';
  }

  return {
    overallStatus,
    generatedAt: new Date().toISOString(),
    summary: {
      passCount,
      failCount,
      reviewCount,
      notCheckedCount,
    },
    checks,
    disclaimer: MANDATORY_FIT_DISCLAIMER,
  };
}
