# ApnaGhar (अपना घर) — Implementation Baseline Report

**Date**: 2026-10-04  
**Project**: ApnaGhar (Evolved from FitCheck baseline)  
**Author**: Principal Product Engineer & Spatial Systems Architect  

---

## 1. Environment & Package Verification

- **Node.js**: `v22.18.0`
- **Package Manager**: npm `v10.9.3`
- **Bundler & Dev Server**: Vite `v8.3.2`
- **Compiler**: TypeScript `v6.0.2` (`strict: true`, `verbatimModuleSyntax: true`)
- **Key Dependencies**:
  - `react`: `^19.2.8`
  - `react-dom`: `^19.2.8`
  - `three`: `^0.186.0`
  - `@types/three`: `^0.186.0`
  - `lucide-react`: `^1.16.0`
  - `vitest`: `^5.0.3`

---

## 2. Baseline Test Execution Results

Command: `npm test` (`vitest run`)  
Result: **29/29 Passed (0 Failed, 0 Skipped)** in 6 test files.

| Test File | Tests | Status | Scope Tested |
| :--- | :--- | :--- | :--- |
| `src/tests/units.test.ts` | 3 | PASS | cm canonical unit conversions (`m`, `in`, `ft`), formatting, freeform string parsing |
| `src/tests/geometry.test.ts` | 9 | PASS | 2D SAT OBB collision detection, rotated corner calculations, room bounds checks, door swing arcs, grid snapping |
| `src/tests/fitEngine.test.ts` | 7 | PASS | PASS / FAIL / REVIEW / NOT_CHECKED semantics, confirmed collisions, unconfirmed photo estimates, door clearance obstructions, disclaimer verification |
| `src/tests/storageAndPrivacy.test.ts` | 5 | PASS | Local persistence reload, photo stripping on export by default, explicit photo opt-in, photo purging, JSON import validation |
| `src/tests/modelConsistency.test.ts` | 3 | PASS | 2D-to-3D metric centimeter scale invariance, coordinate transforms without float drift, provenance metadata |
| `src/tests/aiVisionOffline.test.ts` | 2 | PASS | Zero network calls when external AI consent is disabled, graceful local heuristic fallback on API failure |

---

## 3. Current Working Features & Architecture Map

1. **Canonical Model** (`src/types/model.ts`):
   - Defined room dimensions (width, length, height, wall thickness), openings (doors, windows), furniture items (x, y, z, rotation, width, depth, height, clearances, color, modelType, provenance, isConfirmed).
   - Provenance tracking: `manual`, `catalog`, `photo-estimate`, `ai-suggestion`.
2. **Computational Geometry** (`src/utils/geometry.ts`):
   - Separating Axis Theorem (SAT) for 2D rotated rectangles.
   - Door swing sector polygons.
   - Clearance zone polygons (front, back, left, right).
3. **Fit Check Engine** (`src/utils/fitEngine.ts`):
   - Categorized fit evaluation with PASS / FAIL / REVIEW / NOT_CHECKED semantics.
   - Mandatory legal safety and compliance disclaimer.
4. **Interactive 2D Planner** (`src/components/Planner2D/Canvas2D.tsx`):
   - High-DPI Canvas, pan, zoom, grid snap (5/10/25cm), real-time distance rulers to walls, rotation handle, keyboard shortcuts (`R`, arrows, `Tab`, `Del`).
5. **Interactive 3D Viewer** (`src/components/Viewer3D/ThreeViewer.tsx`):
   - Three.js procedural furniture models (sofa, bed, dining table, desk, bookcase, plant, lamp with PointLight, TV unit).
   - Camera presets: Isometric 45°, Top-Down, Eye-Level Walkthrough.
   - Synchronized with 2D canonical state.
6. **Local-First Privacy & Storage** (`src/utils/storage.ts`):
   - LocalStorage persistence.
   - Privacy-safe export: Strips room photo bytes by default unless user opts in.
   - Purge photo and data on demand.
7. **Photo AI Assistant** (`src/utils/aiVision.ts`, `src/components/PhotoAI/PhotoUploadModal.tsx`):
   - 100% on-device heuristic engine (offline, private, MIT License).
   - Optional external Gemini Vision integration requiring explicit user toggle and personal API key.

---

## 4. Identified Implementation Gaps for ApnaGhar Evolution

1. **Whole-Home & Multi-Room Project Model**:
   - Current model is single-room centric (`FitProject` has a single `room: RoomModel`).
   - Need: Evolve `HomeProject` to support multiple rooms, floor grouping (e.g. Ground Floor, First Floor), and room switcher without losing work.
   - Backward compatibility: Existing single-room projects must seamlessly migrate to a home project with one default room.
2. **Interior Styling, Materials, and Finishes**:
   - Need: Wall color palettes (architectural warm neutrals, sage, terracotta, slate), flooring finishes (natural oak hardwood, polished concrete, limestone tile, terrazzo, herringbone parquet), and furniture materials.
   - Need: 3D textures/materials reflecting flooring and wall finishes.
   - Need: Design Variants comparison (e.g., Design Option A vs Design Option B for the same room).
3. **Design System & Visual Experience**:
   - Current styling is dark blue/cyan tech-oriented.
   - Need: Transform into ApnaGhar's warm, architectural, editorial identity: warm stone, sand, natural wood, muted sage accents, elegant typography (`Outfit`, `Plus Jakarta Sans`), accessible contrast, cohesive layout.
4. **Enhanced 2D Planner**:
   - Undo/Redo stack for layout operations.
   - Multi-room overview & quick floor switcher.
5. **Whole-Home Overview & Comparison**:
   - Home-level dashboard displaying all rooms, total area, room completion statuses, unresolved fit issues, and design comparisons.
