# FitCheck 🛋️📐

> **Privacy-Conscious, AI-Assisted Whole-Room Spatial Planning & Fit Validation Web App**

FitCheck is an architectural 2D and 3D spatial planner designed for real-world home furnishing. It enables users to create rooms, arrange furniture with physical accuracy, inspect arrangements in 3D, and receive definitive geometric fit checks with strict PASS / FAIL / REVIEW semantics.

---

## 🌟 Key Features

1. **Dual-View 2D/3D Synchronization**:
   - **Interactive 2D Canvas**: Drag-and-drop furniture with grid snapping, real-time distance-to-walls ruler guides, interactive rotation stalks, door opening arcs, and clearance zones.
   - **Interactive 3D Visualizer**: Powered by Three.js with realistic lighting, stylized procedural furniture models (sofas with cushions, dining tables with legs, beds with pillows and headboards, lowline TV consoles, bookcases, lamps with point light emissions, plants with terracotta pots), and instant camera presets (Isometric, Top-Down, Eye-Level Walkthrough).
   - **Zero Drift**: 2D and 3D interfaces share the exact same canonical room coordinate model.

2. **Rigorous Geometric Fit Engine**:
   - Evaluates physical boundaries and oriented collisions independently of AI.
   - **Separating Axis Theorem (SAT)** for 2D Oriented Bounding Box (OBB) collision detection between arbitrarily rotated rectangles.
   - **Door Swing Clearance**: Calculates 90-degree opening arcs and detects furniture blocking ingress/egress.
   - **Functional Clearances**: Evaluates drawer pullout room, chair pushback buffer, and walking paths.

3. **Strict Fit-Report Semantics**:
   - `PASS`: All relevant configured checks pass with confirmed inputs.
   - `FAIL`: A confirmed geometric constraint is violated (collision, out-of-bounds, door blockage).
   - `REVIEW`: A result depends on uncertain, estimated, or unconfirmed inputs (photo estimates, unconfirmed suggestions).
   - `NOT CHECKED`: Insufficient information exists (empty room, missing dimensions).
   - **Prominent Legal Disclaimer**:
     > *"Passing a room geometry check does not guarantee successful delivery, installation, structural safety, or compliance with building codes."*

4. **Privacy-First AI Room Photo Assistant**:
   - **100% On-Device Heuristic Engine** by default: Proposes furniture arrangements and estimated dimensions without any network calls or image bytes leaving the user's browser.
   - **Strict Provenance Tracking**: Every dimension records its source (`manual`, `catalog`, `photo-estimate`, `ai-suggestion`) and confirmation status (`isConfirmed: boolean`).
   - **Safe Export by Default**: When exporting or sharing projects, room photographs are automatically stripped from `.fitcheck.json` files unless the user explicitly checks the opt-in box.
   - **One-Click Data Purge**: Users can permanently delete stored photographs and clear cached data at any time.

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js v18+ (tested on Node v22.18.0)
- npm v9+

### Installation & Launch
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start local development server
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your web browser.

---

## 🧪 Automated Testing & Results

FitCheck includes an automated test suite executed with Vitest covering the entire geometric and privacy engine:

```
 RUN  v5.0.3 C:/Users/devde/Downloads/first

 ✓ src/tests/units.test.ts (3 tests)
   - converts between centimeters, meters, inches, and feet accurately
   - formats dimensions with unit labels and precision
   - parses freeform user input strings across units
 ✓ src/tests/geometry.test.ts (9 tests)
   - calculates unrotated furniture corner coordinates correctly
   - calculates rotated furniture corner coordinates accurately
   - detects when furniture is fully inside room boundaries
   - detects when furniture crosses room boundaries
   - detects rotated furniture boundary crossing
   - detects axis-aligned rectangle overlaps
   - detects overlap for arbitrarily rotated rectangles using SAT
   - evaluates door swing polygons and detects door obstruction
   - snaps coordinates to grid step properly
 ✓ src/tests/fitEngine.test.ts (7 tests)
   - flags invalid or non-positive room dimensions as FAIL
   - returns NOT_CHECKED for an empty room with no furniture
   - returns PASS when all furniture is well-spaced and confirmed
   - returns FAIL when confirmed furniture overlaps (geometric violation)
   - returns REVIEW instead of FAIL when collision involves unconfirmed item
   - detects door clearance obstruction and flags FAIL if confirmed
   - flags unconfirmed items with REVIEW status in provenance audit
 ✓ src/tests/modelConsistency.test.ts (3 tests)
   - maintains strict 1:1 metric centimeter scale across all furniture pieces
   - maps 2D room coordinates to 3D space deterministically without floating drift
   - guarantees every item contains provenance and confirmation status
 ✓ src/tests/storageAndPrivacy.test.ts (5 tests)
   - persists and reloads project state faithfully
   - STRIPS private room photograph by default upon export
   - includes private photo in export ONLY when user explicitly checks opt-in
   - purges room photo permanently on demand
   - validates imported JSON structure and guards against malformed input
 ✓ src/tests/aiVisionOffline.test.ts (2 tests)
   - runs 100% locally when external AI consent is disabled
   - falls back gracefully to local engine if external API throws or fails

Test Files:  6 passed (6)
Tests:       29 passed (29)
```

Run tests on demand with:
```bash
npm test
```

---

## 🏛️ Architecture Overview

```
src/
├── types/
│   └── model.ts             # Canonical Data Model (Room, Furniture, Openings, FitReport)
├── utils/
│   ├── units.ts             # Exact conversions: cm (canonical), m, in, ft & string parser
│   ├── geometry.ts          # Separating Axis Theorem (SAT), OBB corners, door swing arcs
│   ├── fitEngine.ts         # Pure geometric evaluator (PASS, FAIL, REVIEW, NOT CHECKED)
│   ├── catalog.ts           # Curated catalog templates with real-world dimensions & clearances
│   ├── aiVision.ts          # On-device heuristic engine + optional opt-in Gemini Vision
│   └── storage.ts           # Persistence, privacy export filter, and preloaded sample rooms
├── components/
│   ├── Navbar.tsx           # Brand, project switcher, 2D/3D toggle, units, live Fit badge
│   ├── Planner2D/
│   │   └── Canvas2D.tsx     # High-DPI Canvas 2D interactive planner with pan/zoom/rotate/snap
│   ├── Viewer3D/
│   │   └── ThreeViewer.tsx  # Three.js 3D spatial viewer with procedural models & camera presets
│   ├── FitReport/
│   │   └── FitReportModal.tsx # Itemized validation checklist, remedies, and safety disclaimer
│   ├── FurnitureCatalog/
│   │   └── CatalogDrawer.tsx  # Filterable catalog & custom piece dimension creator
│   ├── RoomSetup/
│   │   └── RoomModal.tsx    # Room dimensions (W x L x H), wall thickness, doors & windows
│   ├── PhotoAI/
│   │   └── PhotoUploadModal.tsx # Privacy photo assistant with canvas bounding box overlays
│   ├── ExportModal/
│   │   └── ExportModal.tsx  # Privacy-preserving JSON export, printable PDF report, demos
│   ├── SettingsModal/
│   │   └── SettingsModal.tsx # Unit defaults, grid snap, AI consent & data purge
│   └── ProjectListModal/
│       └── ProjectListModal.tsx # Local project directory switcher and creation
├── index.css                # Curated architectural dark mode design system (Vanilla CSS)
└── App.tsx                  # Root state orchestration and reactive event flow
```

---

## 🤖 AI Model Details & License Disclosure

1. **On-Device Heuristic Spatial Engine (Default)**:
   - **Execution**: 100% Client-side in browser memory.
   - **Network Transmission**: Zero external requests.
   - **License**: MIT License (FitCheck built-in).
   - **Method**: Evaluates room bounding aspect ratio, perspective vanishing points, and functional zoning to propose proportional furniture pieces with realistic clearance requirements.

2. **External Vision AI (Optional User Opt-In)**:
   - **Provider**: Google Gemini 1.5 Flash Vision.
   - **Access**: Strictly gated behind explicit user toggle in Settings (`enableExternalAi`) and user-provided API key.
   - **License**: Google Gemini API Terms of Service.
   - **Graceful Fallback**: If offline, without a key, or encountering rate limits, FitCheck immediately falls back to the on-device heuristic engine without interrupting the user.

---

## 🎬 Demonstration Script

Follow this script to experience the complete user journey:

1. **Open FitCheck**:
   - Navigate to `http://127.0.0.1:5173/`.
   - Observe the preloaded **Sample Scandi Living Room** with sofa, coffee table, media unit, armchair, and indoor plant.
   - Notice the live Fit Check Badge in the navigation bar displaying **FIT PASS**.

2. **Inspect in 3D**:
   - Click the **3D View** button in the navigation bar.
   - Drag to orbit around the room. Right-click to pan. Scroll to zoom.
   - Try the camera preset buttons in the top right: **Isometric**, **Top-Down**, and **Eye-Level**.
   - Click **Snapshot** to download a clean 3D render PNG.
   - Switch back to **2D Plan**.

3. **Cause & Resolve a Geometric Collision**:
   - Click on the **Cozy Lounge Armchair** in the 2D planner.
   - Drag it over the **Nordic 3-Seater Sofa**.
   - Notice the furniture border immediately pulses **crimson red**, and the navigation badge changes to **1 ISSUES (FAIL)**.
   - Click the **ISSUES** badge to open the **Fit Validation Report**.
   - Review the detailed geometric collision breakdown and recommended remedy.
   - Close the report and drag the armchair back to an open area; observe the badge return to **FIT PASS**.

4. **Door Swing Clearance Check**:
   - Drag the armchair close to the South entrance door swing arc.
   - Notice the door obstruction warning: the door cannot swing fully open.
   - Move the armchair clear of the entry door.

5. **Upload Room Photo & AI Assist**:
   - Click the **AI Assist** button in the navbar.
   - Note the **Privacy Guarantee Banner** ensuring photos stay on-device.
   - Upload any room photo (or sample).
   - Review the detected proposals with bounding box overlays on the canvas.
   - Click **Add as Estimate** to add a proposed sofa; notice it enters the room with a dotted amber border and triggers a **REVIEW** status because photo estimates require physical confirmation.
   - Select the item in 2D and click **Confirm** in the inspector to verify its measurement, turning the status back to **PASS**.

6. **Add Catalog Furniture & Custom Pieces**:
   - Click **Add Furniture** to open the Catalog.
   - Browse **Beds**, **Desks**, or **Tables**.
   - Switch to **Custom Dimensions** tab to add a custom piece (e.g. 150 × 80 × 75 cm with 60 cm front clearance).
   - Click **Add Custom Furniture Piece**.

7. **Export & Privacy Verification**:
   - Click the **Export** button in the navbar.
   - Note that **"Include room photograph in export file"** is unchecked by default.
   - Click **Download .fitcheck.json** or click **Printable Report** for a client-ready printable inventory summary.
   - Click the **Demo Rooms** tab to instantly switch to the **Master Bedroom** or **Home Studio & Office**.

---

## ⚠️ Known Limitations & Next Steps

- **L-Shaped Rooms**: The current geometry engine supports rectangular room perimeters with arbitrary internal openings, doors, and windows. Multi-segmented L-shaped and polygon rooms can be added in the next release by extending the polygon wall boundary solver.
- **Ceiling Slopes & Attic Roofs**: Current 3D visualization assumes a flat ceiling height.
- **Local WebAssembly Object Detection**: Can integrate ONNX Web with a quantized MobileNet/YOLO model for fully offline neural network bounding box detection in addition to the heuristic engine.
