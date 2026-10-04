# ApnaGhar (अपना घर) — System Architecture

## 1. Architectural Philosophy

ApnaGhar is architected around four core pillars:
1. **Local-First & Privacy Sovereign**: All room geometry, furniture placements, photos, and reports live on the user's client machine. Zero external API calls without explicit opt-in consent.
2. **Canonical Centimeter Truth**: A single source of spatial truth (`cm`) feeds the 2D planner, 3D visualizer, collision engine, and export pipeline.
3. **Deterministic Geometry Engine**: Physical collisions, boundary breaches, door swing arcs, and clearance zones are evaluated via pure computational geometry (Separating Axis Theorem), independent of AI or network states.
4. **Honest AI & Transparent Uncertainty**: AI proposals and photo analyses are advisory estimates, strictly segregated by provenance and confirmation states.

```
+-----------------------------------------------------------------------------------+
|                                  APNAGHAR CORE                                    |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                  Canonical Home Project Data Store                         |   |
|   |  - Home Metadata (Name, Units, Floors)                                    |   |
|   |  - Rooms (Dimensions, Openings, Wall & Floor Finishes, Design Variants)   |   |
|   |  - Furniture Items (Coordinates, Dimensions, Clearances, Provenance)      |   |
|   |  - Local Photo Context & Privacy Preferences                              |   |
|   +---------------------------------------------------------------------------+   |
|                          |                            |                           |
|                          v                            v                           |
|        +--------------------------------+   +--------------------------------+    |
|        |   2D Interactive Canvas        |   |   3D Interactive Visualizer    |    |
|        |   - Metric / Imperial Grid     |   |   - Three.js WebGL Engine      |    |
|        |   - Real-time Distance Rulers  |   |   - Procedural Furniture 3D    |    |
|        |   - Rotation Stalk & Handles   |   |   - Floor/Wall Materials       |    |
|        |   - Door Swing Arcs & Openings |   |   - Camera Presets (Iso/Top/Eye|    |
|        |   - Undo / Redo History Stack  |   |   - Dynamic Collision Lighting |    |
|        +--------------------------------+   +--------------------------------+    |
|                          |                            |                           |
|                          +-------------+--------------+                           |
|                                        |                                          |
|                                        v                                          |
|                 +---------------------------------------------+                   |
|                 |       Deterministic Fit Evaluation Engine   |                   |
|                 |  - Separating Axis Theorem (SAT) 2D OBB     |                   |
|                 |  - Door Swing Opening Sector Polygons       |                   |
|                 |  - Drawer Pullout & Seating Clearance Zones |                   |
|                 |  - Strict Semantics: PASS, FAIL, REVIEW     |                   |
|                 |  - Mandatory Safety & Code Notice Banner    |                   |
|                 +---------------------------------------------+                   |
|                                        |                                          |
|         +------------------------------+-------------------------------+          |
|         v                                                              v          |
|  +---------------------------+                                  +---------------+ |
|  | Local Storage & Export    |                                  | AI Vision &   | |
|  | - IndexedDB / LocalStorage|                                  | Suggestions   | |
|  | - Photo Stripping by      |                                  | - Local 100%  | |
|  |   Default on Export       |                                  |   Heuristic   | |
|  | - Printable PDF / HTML    |                                  | - Opt-in      | |
|  | - Project Backup / JSON   |                                  |   Gemini      | |
|  +---------------------------+                                  +---------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 2. Data Flow & Canonical State Lifecycle

1. **User Interaction**: User creates or switches rooms, drags or rotates furniture in 2D, or updates finishes/materials.
2. **State Transition**: State mutation occurs purely in canonical centimeters (`cm`) and degrees (`0-359`).
3. **Reactive Re-computation**:
   - `evaluateRoomFit()` runs deterministically over the current room's walls, openings, and furniture footprints.
   - Status updates instantly to `PASS`, `FAIL`, or `REVIEW`.
4. **Synchronized Rendering**:
   - 2D Canvas redraws the floor plan with distance rulers and clearance cones.
   - 3D Three.js scene updates meshes, coordinates, rotations, and collision warning highlights.
5. **Durable Persistence**: State is automatically serialized to browser local storage.
